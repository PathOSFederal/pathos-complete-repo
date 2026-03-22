# Day 46 — Desktop-First Front Door

**Date:** January 22, 2026  
**Type:** Messaging Alignment

---

## What Changed

- The landing page now explains that PathOS is a desktop application and keeps USAJOBS as the system of record.
- A new download page guides users into installing the desktop app with OS placeholders, and Windows downloads are now enabled.
- Download button now downloads the PathOS Desktop installer.
- Trust boundary wording is consistent between the web front door and the desktop welcome experience.

---

## Why This Matters

PathOS is desktop-first by design. The web experience now makes it obvious where the real work happens and why that is safer for federal job seekers. This reduces confusion and reinforces that PathAdvisor is guidance, not automation.

---

## What Users Will Notice

- A calm landing page that answers: "Where do I actually do the work?"
- A clear, step-by-step download flow with expectations set upfront.
- Consistent trust boundary language from the website to the desktop app.

---

## Trust + OPSEC Clarity

- PathOS runs locally in a desktop shell.
- It does not intercept credentials or read the USAJOBS page DOM.
- It does not modify USAJOBS or submit anything on a user's behalf.

---

*This change is copy and layout only. No backend or automation behavior is introduced.*
