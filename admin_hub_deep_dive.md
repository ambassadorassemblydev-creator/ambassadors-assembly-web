# 🏛 Ambassadors Assembly Admin Hub: The Comprehensive Blueprint

This document defines the **functional DNA** of the Admin Hub. It ignores the technology stack to focus purely on **Logic, UX Flow, and Business Requirements**.

---

## 🧭 1. Sidebar Anatomy: The "Nervous System"

The sidebar is not just links; it's a tiered management system.

### Category: COMMAND CENTER

| Section | What's Inside? | Why is it here? |
| :--- | :--- | :--- |
| **Real-time Dashboard** | Live Giving Chart, Today's Attendance, Urgent Prayer Count, System Health. | High-level "Pulse" of the church for senior leadership. |
| **Global Audit Log** | A chronological feed of ALL admin actions: *\"Admin X updated Sermon Y\"*. | Transparency. Accountabiltiy for all changes made to sensitive data. |

### Category: PEOPLE CRM

| Section | What's Inside? | Why is it here? |
| :--- | :--- | :--- |
| **Member Directory** | Profile cards with Title (Pastor, Dr, Mr), Baptism status, and "AA-ID". | Core database. Every spiritual journey starts here. |
| **Family Groups** | Visual family trees. Link children to parents even with different surnames. | Church is family-centric. Managing household giving and service together. |
| **Pastoral Notes** | Private, encrypted timeline of counseling and spiritual growth. | **PASTORS ONLY**. Highly sensitive spiritual documentation. |

### Category: OPERATIONS (Internal Ops)

| Section | What's Inside? | Why is it here? |
| :--- | :--- | :--- |
| **Departments** | Media, Finance, Logistics, Ushering, Welfare. | These are the **Operational Engines**. They keep the building and service running. |
| **Worker Roster** | Contract dates, DBS (background) check status, position history. | Managing the "Staff/Volunteer" force officially. |
| **The Master Rota** | Drag-and-drop calendar for Service assignments. | Preventing "Worker Burnout" and double-booking. |

### Category: ENGAGEMENT (External/Outreach)

| Section | What's Inside? | Why is it here? |
| :--- | :--- | :--- |
| **Ministries** | Youth, Men of Valour, Women of Excellence, Missions. | These are **Community Groups**. They focus on specific demographics and outreach. |
| **Events Hub** | Registration lists, QR code check-in logs, venue details. | Managing the "Life" of the church beyond Sundays. |
| **Small Groups** | Home-cells and location-based fellowship tracking. | Tracking the "under-surface" growth of the congregation. |

---

## 🧠 2. The "Group Logic": Ministry vs. Department

The system automatically knows the difference based on the **SQL table architecture**:

- **A Department** (Internal): Linked to `church_departments`. Focuses on **Service Execution** (e.g., *I work in Media during the service*).
- **A Ministry** (Outreach): Linked to `ministries`. Focuses on **Fellowship/Category** (e.g., *I am part of the Youth Ministry*).

**UI Rule**: If an admin clicks "Add Group," a toggle asks: *"Is this an Operational Department or a Fellowship Ministry?"*

- Selecting **Department** prompts for: *Head of Department, Budget Code, DBS Requirement.*
- Selecting **Ministry** prompts for: *Ministry Leader, Target Demographic, Outreach Category.*

---

## 🔐 3. The Role Matrix (RBAC)

What can who do? This table defines the "Hard Logic" of the platform.

| Permission | Super Admin | Admin | Pastor |
| :--- | :---: | :---: | :---: |
| Manage User Roles | ✅ | ❌ | ❌ |
| View Financials (Giving) | ✅ | ✅ | ❌ |
| Edit Sermon/Events | ✅ | ✅ | ✅ |
| Access Pastoral Notes | ❌ | ❌ | ✅ |
| Delete Members | ✅ | ❌ | ❌ |
| Approve Testimonies | ✅ | ✅ | ✅ |

---

## 📑 4. The Interaction Map: Popups & Modals

Every major action happens in a **Popup (Modal/Drawer)** to keep the Admin context-aware.

### Page: Member Directory

- **Popup: [Add New Member]**: A multi-step wizard. Step 1: Basic Info. Step 2: Spiritual History. Step 3: Family Link.
- **Popup: [Milestone Awarder]**: Triggered from member profile. Select "Baptism" or "Wedding" to auto-generate a certificate/record.

### Page: Finance Hub

- **Popup: [Giving Reconciliation]**: Allows manual entry of cash/check donations to match with digital logs.
- **Popup: [Category Editor]**: Quick editor for donation funds (e.g., "Building Fund", "Tithes").

### Page: Rota/Schedule

- **Popup: [Conflict Resolver]**: Appears if you try to assign "John Doe" to both Sound Desk and Choir. It shows John's current conflict and suggests a replacement.

---

## ✏️ 5. The "Edit Button" Lifecycle

What actually happens when you click "Edit"?

1. **State Transition**: The card/row transforms into "Edit Mode." Instead of text, you see inputs.
2. **Validation**: As you type, the UI checks for errors (e.g., *Is this a valid AA-ID?*).
3. **Conflict Lock**: If another Admin is already editing that specific record, a "Lock" icon appears: *"Admin Jane is currently editing this member."*
4. **The Save Hook**: Upon clicking "Save," the system does two things:
    - **A**: Updates the database.
    - **B**: Triggers a function to write to the `audit_log`: *\"[Time] [User] updated [Field] from [Old Value] to [New Value]\"*.

---

## 🖌️ 6. Maxxed Out UI Experience (The "Feel")

- **Command + K**: A global "Search Everything" bar that works from any page.
- **Glassmorphism Panels**: Dark-themed panels with subtle transparency that reflect the church's premium aesthetic.
- **Bulk Actions**: Check multiple members to "Move to Department" or "Export Data" in one click.
- **Live Sync**: If a member registers for an event on the main site, a small notification badge appears on the Admin Events page instantly.
