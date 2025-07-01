# Invitation Flow Sequence Diagrams

This document provides detailed sequence diagrams for the channel invitation process in the OPTRIXTRADES bot.

## Basic Invitation Flow

The following diagram shows the basic flow for a successful invitation:

```
┌─────────┐          ┌──────────────┐          ┌─────────────┐          ┌──────────┐          ┌───────┐
│  User   │          │ botExtensions │          │ Telegram API│          │ analytics│          │ redis │
└────┬────┘          └───────┬───────┘          └──────┬──────┘          └────┬─────┘          └───┬───┘
     │                       │                         │                      │                    │
     │ inviteUserToChannel  │                         │                      │                    │
     │───────────────────────>                         │                      │                    │
     │                       │                         │                      │                    │
     │                       │ Validate IDs            │                      │                    │
     │                       │─────────────────────────>                      │                    │
     │                       │                         │                      │                    │
     │                       │ Check rate limits       │                      │                    │
     │                       │─────────────────────────────────────────────────────────────────────>│
     │                       │                         │                      │                    │
     │                       │ Track invitation attempt│                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │                       │ createChatInviteLink    │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ sendMessage             │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Track successful invite │                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │ Return result         │                         │                      │                    │
     │<───────────────────────                         │                      │                    │
     │                       │                         │                      │                    │
```

## Error Handling and Retry Flow

The following diagram shows the flow when errors occur and retries are attempted:

```
┌─────────┐          ┌──────────────┐          ┌─────────────┐          ┌──────────┐          ┌───────┐
│  User   │          │ botExtensions │          │ Telegram API│          │ analytics│          │ redis │
└────┬────┘          └───────┬───────┘          └──────┬──────┘          └────┬─────┘          └───┬───┘
     │                       │                         │                      │                    │
     │ inviteUserToChannel  │                         │                      │                    │
     │───────────────────────>                         │                      │                    │
     │                       │                         │                      │                    │
     │                       │ Validate IDs            │                      │                    │
     │                       │─────────────────────────>                      │                    │
     │                       │                         │                      │                    │
     │                       │ Check rate limits       │                      │                    │
     │                       │─────────────────────────────────────────────────────────────────────>│
     │                       │                         │                      │                    │
     │                       │ Track invitation attempt│                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │                       │ createChatInviteLink    │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ ERROR: FLOOD_WAIT       │                      │                    │
     │                       │<────────────────────────│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Wait (exponential backoff)                     │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ Retry: createChatInviteLink                    │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ ERROR: CHAT_ADMIN_REQUIRED                     │                    │
     │                       │<────────────────────────│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Fallback: exportChatInviteLink                 │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Success                 │                      │                    │
     │                       │<────────────────────────│                      │                    │
     │                       │                         │                      │                    │
     │                       │ sendMessage             │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Track successful invite │                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │ Return result         │                         │                      │                    │
     │<───────────────────────                         │                      │                    │
     │                       │                         │                      │                    │
```

## Rate Limiting Flow

The following diagram shows the flow when rate limits are exceeded:

```
┌─────────┐          ┌──────────────┐          ┌─────────────┐          ┌──────────┐          ┌───────┐
│  User   │          │ botExtensions │          │ Telegram API│          │ analytics│          │ redis │
└────┬────┘          └───────┬───────┘          └──────┬──────┘          └────┬─────┘          └───┬───┘
     │                       │                         │                      │                    │
     │ inviteUserToChannel  │                         │                      │                    │
     │───────────────────────>                         │                      │                    │
     │                       │                         │                      │                    │
     │                       │ Validate IDs            │                      │                    │
     │                       │─────────────────────────>                      │                    │
     │                       │                         │                      │                    │
     │                       │ Check rate limits       │                      │                    │
     │                       │─────────────────────────────────────────────────────────────────────>│
     │                       │                         │                      │                    │
     │                       │ Rate limit exceeded     │                      │                    │
     │                       │<─────────────────────────────────────────────────────────────────────│
     │                       │                         │                      │                    │
     │                       │ Track rate limit event  │                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │ RateLimitError        │                         │                      │                    │
     │<───────────────────────                         │                      │                    │
     │                       │                         │                      │                    │
```

## Non-Retryable Error Flow

The following diagram shows the flow when a non-retryable error occurs:

```
┌─────────┐          ┌──────────────┐          ┌─────────────┐          ┌──────────┐          ┌───────┐
│  User   │          │ botExtensions │          │ Telegram API│          │ analytics│          │ redis │
└────┬────┘          └───────┬───────┘          └──────┬──────┘          └────┬─────┘          └───┬───┘
     │                       │                         │                      │                    │
     │ inviteUserToChannel  │                         │                      │                    │
     │───────────────────────>                         │                      │                    │
     │                       │                         │                      │                    │
     │                       │ Validate IDs            │                      │                    │
     │                       │─────────────────────────>                      │                    │
     │                       │                         │                      │                    │
     │                       │ Check rate limits       │                      │                    │
     │                       │─────────────────────────────────────────────────────────────────────>│
     │                       │                         │                      │                    │
     │                       │ Track invitation attempt│                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │                       │ createChatInviteLink    │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ ERROR: CHANNEL_NOT_FOUND│                      │                    │
     │                       │<────────────────────────│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Track failed invite     │                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │ ChannelError          │                         │                      │                    │
     │<───────────────────────                         │                      │                    │
     │                       │                         │                      │                    │
```

## Complete Invitation Process

The following diagram shows the complete invitation process with all possible paths:

```
┌─────────┐          ┌──────────────┐          ┌─────────────┐          ┌──────────┐          ┌───────┐
│  User   │          │ botExtensions │          │ Telegram API│          │ analytics│          │ redis │
└────┬────┘          └───────┬───────┘          └──────┬──────┘          └────┬─────┘          └───┬───┘
     │                       │                         │                      │                    │
     │ inviteUserToChannel  │                         │                      │                    │
     │───────────────────────>                         │                      │                    │
     │                       │                         │                      │                    │
     │                       │ Validate channelId      │                      │                    │
     │                       │─────────────────────────>                      │                    │
     │                       │                         │                      │                    │
     │                       │ Validate userId         │                      │                    │
     │                       │─────────────────────────>                      │                    │
     │                       │                         │                      │                    │
     │                       │ Check user rate limit   │                      │                    │
     │                       │─────────────────────────────────────────────────────────────────────>│
     │                       │                         │                      │                    │
     │                       │ Check channel rate limit│                      │                    │
     │                       │─────────────────────────────────────────────────────────────────────>│
     │                       │                         │                      │                    │
     │                       │ Track invitation attempt│                      │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │                       │ Start retry loop        │                      │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ createChatInviteLink    │                      │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Success or Error        │                      │                    │
     │                       │<────────────────────────│                      │                    │
     │                       │                         │                      │                    │
     │                       │ If error: Map to custom error type             │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ If retryable: Wait with exponential backoff    │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ If CHAT_ADMIN_REQUIRED: Fallback to exportChatInviteLink          │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ If invite link created: sendMessage            │                    │
     │                       │────────────────────────>│                      │                    │
     │                       │                         │                      │                    │
     │                       │ Success or Error        │                      │                    │
     │                       │<────────────────────────│                      │                    │
     │                       │                         │                      │                    │
     │                       │ If error: Map to custom error type             │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ If retryable: Continue retry loop              │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ If non-retryable: Break retry loop             │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ If max retries reached: Throw InvitationError  │                    │
     │                       │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                    │
     │                       │                         │                      │                    │
     │                       │ If success: Track successful invite            │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │                       │ If error: Track failed invite                  │                    │
     │                       │──────────────────────────────────────────────>│                    │
     │                       │                         │                      │                    │
     │ Return result or error│                         │                      │                    │
     │<───────────────────────                         │                      │                    │
     │                       │                         │                      │                    │
```

## Component Interaction Diagram

The following diagram shows how the different components interact during the invitation process:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                              Application                                    │
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │                 │     │                 │     │                 │       │
│  │  botExtensions  │────▶│    botErrors    │     │     logger      │       │
│  │                 │     │                 │     │                 │       │
│  └────────┬────────┘     └─────────────────┘     └────────▲────────┘       │
│           │                                               │                │
│           │                                               │                │
│           │                                               │                │
│           │                                               │                │
│           │            ┌─────────────────┐               │                │
│           │            │                 │               │                │
│           └───────────▶│    analytics    │───────────────┘                │
│                        │                 │                                 │
│                        └────────┬────────┘                                 │
│                                 │                                          │
│                                 │                                          │
│                                 │                                          │
│                        ┌────────▼────────┐                                 │
│                        │                 │                                 │
│                        │  configuration  │                                 │
│                        │                 │                                 │
│                        └─────────────────┘                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                             External Services                               │
│                                                                             │
│                  ┌─────────────────┐     ┌─────────────────┐               │
│                  │                 │     │                 │               │
│                  │  Telegram API   │     │      Redis      │               │
│                  │                 │     │                 │               │
│                  └─────────────────┘     └─────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Error Handling Decision Tree

The following diagram shows the decision tree for error handling during the invitation process:

```
Error Occurs
    │
    ├─── Is it a validation error? (Invalid channelId or userId)
    │    │
    │    ├─── Yes ──▶ Throw ChannelError or UserError
    │    │
    │    └─── No ───┐
    │                │
    ├─── Is it a rate limit error?
    │    │
    │    ├─── Yes ──▶ Throw RateLimitError
    │    │
    │    └─── No ───┐
    │                │
    ├─── Is it a Telegram API error?
    │    │
    │    ├─── Yes ──▶ Map to custom error type using mapTelegramError
    │    │            │
    │    │            ├─── Is it retryable? (FLOOD_WAIT, TIMEOUT, etc.)
    │    │            │    │
    │    │            │    ├─── Yes ──▶ Wait and retry (up to maxRetries)
    │    │            │    │
    │    │            │    └─── No ───┐
    │    │            │                │
    │    │            ├─── Is it a permission error? (CHAT_ADMIN_REQUIRED)
    │    │            │    │
    │    │            │    ├─── Yes ──▶ Try fallback method (exportChatInviteLink)
    │    │            │    │
    │    │            │    └─── No ───┐
    │    │            │                │
    │    │            └─── Throw appropriate error (ChannelError, PermissionError, etc.)
    │    │
    │    └─── No ───┐
    │                │
    └─── Is it a network/Redis error?
         │
         ├─── Yes ──▶ Log error and continue (non-critical)
         │
         └─── No ───▶ Throw BotError (generic error)
```

These diagrams provide a comprehensive view of the invitation process, including normal operation, error handling, and component interactions. They can be used for understanding the system, troubleshooting issues, and planning future enhancements.