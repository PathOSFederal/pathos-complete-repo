# PathAdvisor UI Contract

## Conversation-first interaction model
- PathAdvisor uses a conversation feed with visible user and assistant turns.
- Each message becomes a discrete entry in the active thread.
- The feed supports auto-scroll with a jump-to-latest affordance when the user scrolls up.

## Thread history and actions
- Conversations are grouped into named threads with local-only persistence.
- Users can create, rename, delete, clear, and export threads.
- The Conversations workspace reflects the active thread and keeps it in sync.

## Docked and detached parity
- Docked and detached PathAdvisor surfaces share the same thread state.
- Controls and behaviors should match across surfaces for clarity.
