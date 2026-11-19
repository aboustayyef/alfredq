#!/usr/bin/osascript -l JavaScript

ObjC.import("Foundation")

function env(name) {
  const value = $.NSProcessInfo.processInfo.environment.objectForKey(name)
  if (!value) return ""
  return ObjC.unwrap(value) || ""
}

function outputText(payload) {
  const parts = []

  for (const item of payload.output || []) {
    if (item.type !== "message") continue
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text)
      if (content.type === "refusal" && content.refusal) parts.push(content.refusal)
    }
  }

  return parts.join("\n\n").trim()
}

function estimatedHeight(markdown) {
  const logicalLines = markdown.split("\n")
  const wrappedLines = logicalLines.reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 82)), 0)
  const paragraphBreaks = Math.max(0, logicalLines.filter(line => line.trim() === "").length)
  const codeBlocks = (markdown.match(/```/g) || []).length / 2
  const contentHeight = 76 + (wrappedLines * 23) + (paragraphBreaks * 5) + (codeBlocks * 18)
  return Math.max(150, Math.min(560, Math.round(contentHeight)))
}

function uiResult(text, model, isError) {
  return JSON.stringify({
    update: {
      relayout: true,
      ids: {
        answer: { text: text, behaviour: { mode: "replace", scroll: "start" } },
        status: {
          text: isError ? "Request failed · Esc Close" : `${model} · Esc Close`,
          colour: isError ? "systemRedColor" : "secondaryLabelColor"
        },
        copyButton: { enabled: !isError }
      }
    },
    window: { resize: { height: estimatedHeight(text) } }
  })
}

function request(question, apiKey, model, instructions, timeoutSeconds) {
  const body = {
    model: model,
    input: question,
    store: false
  }

  if (instructions) body.instructions = instructions

  const maxTokens = Number.parseInt(env("max_output_tokens"), 10)
  if (Number.isFinite(maxTokens) && maxTokens > 0) body.max_output_tokens = maxTokens

  const task = $.NSTask.alloc.init
  const stdout = $.NSPipe.pipe
  const stderr = $.NSPipe.pipe
  const stdin = $.NSPipe.pipe

  task.executableURL = $.NSURL.fileURLWithPath("/usr/bin/curl")
  task.arguments = [
    "--silent",
    "--show-error",
    "--connect-timeout", "10",
    "--max-time", String(timeoutSeconds),
    "--request", "POST",
    "--header", "Content-Type: application/json",
    "--header", `Authorization: Bearer ${apiKey}`,
    "--data-binary", "@-",
    "https://api.openai.com/v1/responses"
  ]
  task.standardInput = stdin
  task.standardOutput = stdout
  task.standardError = stderr

  const launched = task.launchAndReturnError(false)
  if (!launched) throw new Error("Could not start the API request.")

  const requestData = $(JSON.stringify(body)).dataUsingEncoding($.NSUTF8StringEncoding)
  stdin.fileHandleForWriting.writeData(requestData)
  stdin.fileHandleForWriting.closeFile

  task.waitUntilExit

  const responseData = stdout.fileHandleForReading.readDataToEndOfFile
  const errorData = stderr.fileHandleForReading.readDataToEndOfFile
  const responseString = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(responseData, $.NSUTF8StringEncoding)) || ""
  const errorString = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(errorData, $.NSUTF8StringEncoding)) || ""

  let payload
  try {
    payload = JSON.parse(responseString)
  } catch (_) {
    const detail = errorString.trim() || responseString.trim() || `curl exited with status ${task.terminationStatus}`
    throw new Error(detail)
  }

  if (payload.error) throw new Error(payload.error.message || "The OpenAI API returned an error.")

  const answer = outputText(payload)
  if (!answer) throw new Error("The API returned no text answer.")

  return answer
}

function run(argv) {
  const question = (argv[0] || "").trim()
  const apiKey = env("openai_api_key").trim()
  const model = env("openai_model").trim()
  const instructions = env("openai_instructions").trim()
  const configuredTimeout = Number.parseInt(env("request_timeout"), 10)
  const timeoutSeconds = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 60

  if (!question) return uiResult("## No question supplied\n\nType `q` followed by a question.", model, true)
  if (!apiKey) return uiResult("## Setup required\n\nAdd your OpenAI API key in **Configure Workflow…**.", model, true)
  if (!model) return uiResult("## Setup required\n\nEnter an OpenAI model ID in **Configure Workflow…**.", model, true)

  try {
    return uiResult(request(question, apiKey, model, instructions, timeoutSeconds), model, false)
  } catch (error) {
    return uiResult(`## Request failed\n\n${String(error.message || error)}`, model, true)
  }
}
