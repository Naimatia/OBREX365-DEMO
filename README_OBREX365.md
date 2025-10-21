# OBREX365 CRM - System Documentation

**Generated on:** 2025-07-20 11:25:38

---

## 1. Firestore Collections Schema

### users
- id
- firstname
- lastname
- email
- phoneNumber
- country
- ipAddress
- pictureUrl
- CreationDate
- LastLogin
- Password
- isVerified
- isBanned
- Role (Enum: SuperAdmin, CEO, HR, Seller)
- company_id
- Notification (Boolean)
- forcePasswordReset

### company
- id
- name
- description
- Field
- status
- location
- Region
- CreatedAt
- Logo
- phoneNumber
- emailAddress
- WebSiteUrl
- SocialMediaLinks (Facebook, Instagram, TikTok, LinkedIn)

### contacts
- id
- company_id
- phoneNumber
- email
- name
- region
- seller_id
- status (Enum: Pending, Contacted, Deal, Loss)
- CreationDate
- AffectingDate
- LastUpdateDate
- Notes (List of {note, CreationDate})

### leads
- id
- company_id
- seller_id
- name
- region
- RedirectedFrom
- CreationDate
- status (Enum: Pending, Gain, Loss)
- phoneNumber
- email
- InterestLevel (Low, Medium, High)
- Budget
- Notes (List of {note, CreationDate})

### deals
- id
- company_id
- seller_id
- contact_id (nullable)
- lead_id (nullable)
- Source (Leads, Contacts, Freelance)
- Amount
- Status (Opened, Gain, Loss)
- Description
- Notes (List of {note, CreationDate})
- CreationDate
- LastUpdateDate
- property_id

### properties
- id
- company_id
- title
- description
- OriginalPrice
- SellPrice
- Features (List of strings)
- Location
- address
- Images (List of URLs)
- Source
- NbrBedRooms
- NbrBathRooms
- Type (Studio, Apartment, etc.)
- Status (Pending, Sold)
- Category (OffPlan, Buy, Rent)
- CreationDate
- LastUpdateDateTime
- creator_id
- Notes (List of {note, CreationDate})

### todolist
- id
- company_id
- Creator_id
- Assignee_id (user reference)
- CreationDate
- ToDo
- LastEdit
- Status (ToDo, Doing, Done)
- Notes (List of {note, CreationDate})
- DateLimit 

### employees
- id
- Role
- name
- JoiningDate
- CreationDate
- Salary
- DateSalary (1 to 31)
- phoneNumber
- email
- user_id (nullable)
- LastUpdate
- Status (Working, Vacation)

### vacation
- id
- CreationDate
- StartDate
- EndDate
- employee_id
- Cause

### history
- id
- Action
- user_id
- DateTime
- company_id

### meetings
- id
- DateTime
- creator_id
- company_id
- Users (List of user IDs)
- Type (onligne , onSite)
- Duration
- Title
- Description
- Status (Pending, Cancelled, Completed)
- MeetLink

### invoices
- id
- company_id
- creator_id (user)
- CreationDate
- LastUpdate
- DateLimit
- Status (Pending, Paid, Missed, Cancelled)
- Notes
- Title
- description
- amount
- paymentUrl

---

## 2. First-Time Login Flow for Sellers

When an HR or CEO adds a new Seller:

1. A Firebase Auth account is created with a temporary static password (e.g., "Welcome123").
2. A corresponding user document is created with the field `forcePasswordReset = true`.
3. On first login, the seller is redirected to a "Set New Password" screen.
4. After submitting a new password, the flag is set to `false`.
5. The user proceeds to the dashboard.

**Security Rule Example**:  
Only allow password update if `forcePasswordReset` is false.

---

## 3. CEO and HR Use Cases

### CEO Capabilities:
- Create company account and profile
- Manage company settings
- Add/edit/remove employees (HR, Sellers)
- Create/import contacts
- Assign leads and deals
- View and manage properties
- Access dashboard, kanban, overview
- Schedule meetings
- Review history and reports
- Manage todos
- Approve vacation requests

### HR Capabilities:
- Manage employees (excluding CEO)
- Assign roles
- Import and assign contacts
- Manage leads, deals, properties
- Schedule meetings
- Track todos and vacations
- Limited access to settings
