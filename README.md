# Alfred Q

<img src="icon.png" alt="Alfred Q icon" width="128">

Ask OpenAI a quick question from Alfred and read the answer in a compact, dismissable Alfred 6 UI.

## Download

[Download the latest version](https://github.com/aboustayyef/alfredq/releases/latest/download/Alfred-Q.alfredworkflow)

## Install

1. Double-click `Alfred-Q.alfredworkflow`.
2. Enter your OpenAI API key.
3. Enter the OpenAI model ID you want to use. The workflow does not hard-code a model.
4. Import the workflow.

## Use

Open Alfred and type:

```text
q Why is the sky blue?
```

### Ask a question

Type `q` followed by your question, then press Return.

![Ask OpenAI from Alfred](images/question.png)

### Read the answer

The response appears in a compact native Alfred window with Markdown formatting.

![OpenAI answer in Alfred](images/answer.png)

Press Escape to dismiss the answer window.

The window grows with the answer up to a capped height, after which the Markdown response scrolls. Press Command-C or the Copy button to copy the full answer.

The question is required in normal use; entering only `q` opens the answer view with a short usage reminder.

The keyword, model, instructions, output limit, and timeout can all be changed via **Configure Workflow…**.

## Requirements

- Alfred 6 with the Powerpack
- An OpenAI API key with billing enabled

The workflow uses macOS's built-in JavaScript for Automation and `curl`, so it has no package dependencies.
