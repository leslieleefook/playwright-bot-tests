# Chatbot Testing Framework: General Requirements

This document tracks all user constraints and requirements for the chatbot testing framework.

## General Constraints
- **Real-time Updates**: Any important updates from the chat must be written to this file immediately.
- **Email for Fields**: Use `accesssmartwriter3@gmail.com` for any field requiring an email address.
- **Asset Retrieval**: If the bot sends an email with assets, log in to the Gmail account **10 minutes** after completing the bot interaction.
- **First Test Case**: Successfully log into the Gmail account.
- **Failure Notification**: If the expected email is not received, send an email to `leslieleefook@incusservices.com` using the Gmail account to notify of the failure.
- **Data Integrity**: Do not use "Test" for data entry. Use contextually correct information.
- **Image Support**: The framework must be capable of uploading images if requested by the bot.

## Email Credentials
- **Username**: `accesssmartwriter3@gmail.com`
- **Password**: `,vt5FOtn6M'uaDT}ul9Q`

## Bot Specific Requirements
- **Universal Input**: Always use `accesssmartwriter3@gmail.com` when a bot asks for an email address.
- **Universal Selectors (Typebot)**:
    - Input: `input.text-input`, `input[placeholder*='Type']`
    - Send: `button.typebot-button` (with send/arrow icon)
    - Buttons: `button.typebot-button` (Yes, Exit, etc.)
- **MKT Bot**: https://bot.incusservices.com/mkt
    - Success: *"Congratulations ... Your idea is being worked on"*
- **Claims Bot**: https://bot.incusservices.com/claims
    - Success: [To be verified during execution]
- **TDE Bot**: https://bot.incusservices.com/tde
    - Success: [To be verified during execution]
- **Airoi Bot**: https://go.incusservices.com/airoi
    - Platform: AI ROI Calculator (Custom Form)
- **New Leads Bot**: [SKIPPED]

## Asset Retrieval
If a bot sends a follow-up email, log in to Gmail exactly **10 minutes** after the interaction ends.
