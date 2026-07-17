# Ambassadors Assembly Church Platform — Technical and Feature Overview

This document provides a comprehensive overview of the digital capabilities, feature sets, administrative controls, and system scoring for the Ambassadors Assembly Church Platform.

---

## 1. Core Public Features and Engagement Functions

### User Onboarding and Milestones
* **Account Registration**: A multi-step onboarding system that collects basic personal details, contact information, address details, and communication preferences.
* **Ecclesiastical Milestones**: Tracks spiritual events such as salvation date, baptism date, and membership dates.
* **Birthdays and Anniversaries**: Collects dates of birth and wedding anniversaries, providing automatic greetings and reminders for pastoral care.
* **Emergency Contact Registry**: Secure storage of emergency contact names, phone numbers, and relationships linked directly to the member profile.

### Interactive Media and Worship
* **Sermon Hub**: Media player interface supporting categorized audio and video sermons, series sorting, speaker profiles, and bookmarks.
* **Sermon Comments**: Fully featured comment sections on individual sermons, encouraging community interaction and reflection.
* **Live Streaming**: Direct integration of active live stream cards on the watch page. Features live badges and countdown timers for scheduled broadcasts.
* **Live Stream Chat**: Real-time comment feeds during active live streams, enabling online attendees to participate in worship.

### AI Assistant and Voice Integration
* **Conversational AI Chatbot**: A public-facing interactive chatbot interface allowing visitors to chat with the AI assistant. Chats are logged to the audit system for safety monitoring.
* **AI Voice Call**: A real-time audio calling feature utilizing ElevenLabs signed URLs. Users can place interactive voice calls to the church's AI assistant.
* **Call Quota Controls**: Voice calls are rate-limited to a maximum of 3 calls per user per week, tracked and enforced via Redis cache storage.

### Impact Teams and Volunteerism
* **Placement Registry**: Members can register interest in joining specific functional departments or ministries.
* **Volunteer Applications**: Formal application process where members list their motivation, skills, and spiritual gifts.
* **Workflow Automation**: When a member submits an application, email confirmations and admin notifications are automatically generated.

### Community Connection
* **Prayer Wall**: Support for public and private prayer requests. Verified intercessors can pledge to pray, and updates can be posted as prayers are answered.
* **Testimonies Portal**: A moderated submission flow where members share personal testimonies of faith.
* **Blog and Devotionals**: Daily devotionals and church articles organized by categories.

### Financial Stewardship
* **Donations Portal**: Support for one-time and recurring giving categories (Tithe, Building Fund, Missions, etc.).
* **Giving Statements**: Secure generation and download of giving histories for tax or record purposes.
* **Donation Progress Tracking**: Cinematic building project progress bars showing live funding goals and current amounts.

### PWA and SEO Architecture
* **PWA Offline Mode**: Dedicated offline fallback page allowing cached browsing when network connectivity is lost.
* **App Download Portal**: A landing page guiding users to download the native application.
* **Dynamic Sitemap XML**: Automatic sitemap generation at `/sitemap.xml` for Google SEO indexing.

---

## 2. Secure Administration Workspace (Admin and Pastoral Panel)

The administration panel is a secure workspace restricted to Super Admins, Admins, Pastors, and Leaders. It handles the operational side of the church.

### Member Assignment and Directory
* **Directory Controls**: A searchable table of all church members filtering by active, inactive, suspended, and pending verification statuses.
* **Ecclesiastical Titles**: Management of ecclesiastical titles (such as Pastor, Elder, Deacon, Deaconess, Minister) to designate leadership roles.
* **Department and Ministry Placements**: Placements are controlled via a Manage Assignments dialog, linking profiles to departments, positions, and ministries.

### Approvals Center
* **Staff Verification**: Reviewing and approving profiles of users who claimed to be existing workers or leadership during onboarding, assigning their correct system access levels.
* **Volunteer Management**: Evaluating volunteer applications, placing approved applicants into departments, and creating corresponding worker records.
* **Ministry Join Moderation**: Approving join requests for specific ministries.
* **Content Moderation**: Reviewing and approving submitted prayer requests and testimonies before they are displayed on the public website.

### Live Stream Manager
* **Broadcast Scheduler**: Schedule upcoming live streams with thumbnail URLs and stream descriptions.
* **Active Stream Controls**: Go live, schedule countdowns, and end broadcasts live.

### Master Rota and Volunteering
* **Master Rota**: Schedule volunteers and workers for specific services and duties, tracking attendance and participation.
* **Volunteers Roster**: A list of active volunteers, contact information, and specific team tags.

### Attendance Tracking
* **Service Attendance**: Record and track weekly attendance records, including physical and online counts.
* **Analytics**: Monitor engagement metrics across services.

### Task Management
* **Internal Tasks**: Assign, prioritize, and track administrative tasks among church staff and volunteers.
* **Task Statuses**: Monitor tasks from backlog, in-progress, to completed, with category filters.

### AI Lab
* **AI Assistant**: A specialized AI tool integrated into the workspace for administrative help, sermon outline generation, and pastoral counseling resources.
* **History Logs**: Log AI queries and generated answers for auditing and reuse.

### System Health and Monitoring
* **Sentry Error Tracking**: Full Sentry integration capturing client and server errors.
* **Health Check API**: Dedicated health check endpoint `/api/health` for automated uptime monitoring bots.
* **System Status Panel**: Public and administrative status boards mapping active service uptimes.

### Broadcast and Communication
* **Email Logs**: Centralized delivery logs showing queued, sending, sent, and failed emails.
* **Automated Newsletters**: Manage subscriber lists and broadcast emails.

### Announcement Bar Control
* **Visibility Toggle**: Instantly activate or hide the top alert banner on the public site.
* **Marquee Effects**: Enable scrolling text and marquee behavior.
* **Call to Action Buttons**: Update button text and link endpoints (such as directing visitors to a live stream).

