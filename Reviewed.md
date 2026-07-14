# Review Summary

## Claimant authorization

The one-time reputation update is protected from third-party evidence poisoning.

- Only the claim owner can add evidence to an unreviewed claim.
- Only the claim owner can initiate that claim's score-changing review.
- The contract enforces those checks before evidence is stored or a reputation score can change.
- The claim page reflects the same policy by hiding evidence controls from other wallets and disabling their review action.

This deliberately uses the claimant-authorization option rather than a third-party challenge protocol. It prevents another wallet from ordering misleading evidence ahead of the claimant's sources or forcing a permanent score update.

## Regression coverage

`tests/claimant-authorization.test.mjs` verifies that:

1. A non-claimant cannot add evidence to the claimant's review packet.
2. Claimant authorization occurs before any review code can update the Gravity Score.

Run locally with:

```powershell
npm test
```

## Contract and frontend wiring

The app is configured for the deployed StudioNet contract:

`0x19cE8965Ab1a33390446e5bF3FF883636f14D28f`

The address is wired into the frontend fallback, local/example environment configuration, documentation, and population script.

## Verification completed

- Automated authorization tests passed.
- ESLint passed.
- The live Vercel settings page served the deployed contract address.
- Three complete StudioNet flows were finalized: claimant submits a claim, adds evidence, initiates review, receives a consensus assessment, and gets a resulting score update.
- The live tests produced Unsupported, Verified, and Partially Verified outcomes, confirming that the evidence assessment and bounded reputation-update path operate end to end.

The production build was checked previously; its only blocker in this execution environment was downloading the project's existing Google Fonts from Google, not an application or type error.
