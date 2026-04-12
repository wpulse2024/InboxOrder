You are a senior principal full-stack architect and engineering team lead.

I am building a SaaS called InboxOrder.

========================
CORE PRODUCT IDEA
========================
Convert Facebook Messenger messages into structured e-commerce orders using:

1. Rule-based parsing (first layer)
2. AI fallback (if confidence is low)
3. Manual correction system (UI)
4. Real-time dashboard updates

This is a production-grade multi-tenant SaaS.

========================
TECH STACK
========================

Backend:
- Node.js + Express + TypeScript
- MongoDB (Mongoose)
- BullMQ + Redis
- Socket.io

Frontend:
- Vue 3 + Vite
- Tailwind CSS
- Pinia

========================
ARCHITECTURE RULES
========================

- Multi-tenant system (Facebook pages = tenants)
- Every record must include tenantId
- Clean architecture: controller → service → repository
- No mock data allowed
- Production-grade TypeScript required
- Modular and scalable design
- Use queues for heavy tasks
- Real-time updates required via Socket.io

========================
SYSTEM MODULES
========================

The system MUST include:

1. Facebook webhook ingestion
2. Message processing pipeline
3. Hybrid AI system (rules + AI fallback)
4. Order management system
5. Customer management system
6. Analytics dashboard
7. Notification system
8. Settings & Facebook page integration
9. Real-time updates system
10. Error handling + retry system
11. Mobile responsive frontend dashboard

========================
DATABASE (MONGODB RULES)
========================

Use Mongoose with proper schema design.

Collections required:

- Tenants (Facebook pages)
- Users (customers)
- Messages (raw Facebook messages)
- Orders (final structured orders)
- ParsedOrders (AI + rule outputs)
- OrderStatusHistory
- AiLogs
- WebhookLogs
- NotificationLogs

Rules:
- tenantId must exist in all collections
- Add indexes for performance
- Use timestamps everywhere
- Use ObjectId relationships properly

========================
FACEBOOK INTEGRATION
========================

- Use Facebook Graph API webhook system
- Verify webhook signature
- Store raw messages
- Support multiple pages per tenant
- Save page access tokens securely
- Handle webhook retries and failures

========================
MESSAGE PROCESSING PIPELINE
========================

Flow:

Facebook Message
→ BullMQ Queue
→ Worker Processor
→ Hybrid Parser
→ Order Creation
→ MongoDB Save
→ Socket.io Event

========================
HYBRID PARSER SYSTEM
========================

Step 1: Rule-based parser

Extract:
- intent (order/question/spam)
- product
- quantity
- phone (Bangladesh format)
- address

Support Bangla + English mixed messages.

Confidence scoring:
- phone found = +0.3
- product found = +0.3
- intent found = +0.2
- address found = +0.2

Step 2: If confidence < 0.7 → call AI parser

Step 3: AI parser must return:
- intent
- product
- quantity
- phone
- address
- confidence_score

Step 4: Save source:
- rule or ai

========================
AI SYSTEM RULES
========================

- Use HTTP-based AI calls (no SDK dependency)
- Must support Bangla + English
- Must safely parse JSON responses
- Must have fallback if AI fails (use rule-based result)

========================
ORDER SYSTEM
========================

- Create orders from parsed messages
- Status flow:
  pending → confirmed → delivered → cancelled

- Track order status history
- Support pagination and filtering
- Tenant-based isolation required

========================
REAL-TIME SYSTEM
========================

Use Socket.io for:

- New order notifications
- Order status updates
- Live dashboard updates

========================
API STRUCTURE
========================

Create REST APIs:

/auth
/webhook/facebook
/orders
/orders/:id
/customers
/analytics
/settings

Follow:
controller → service → repository pattern

========================
FRONTEND (VUE 3 DASHBOARD)
========================

Build SaaS dashboard with:

- Authentication system
- Sidebar + topbar layout
- Orders table (real-time)
- Order detail drawer
- Editable AI parsed data
- Confidence score UI
- Customers module
- Settings page
- Analytics dashboard

Must include:
- Pinia store
- Axios API layer
- Route guards
- Mobile responsive design

========================
ORDERS DASHBOARD UI RULES
========================

- Table view of orders
- Filters (status, date, product)
- Real-time updates
- Status update buttons

Order Detail Drawer:
- Raw Facebook message
- AI parsed data
- Editable fields
- Save corrections API

Show AI confidence score visually.

========================
CUSTOMERS MODULE
========================

- List customers
- Search by phone/name
- Show order history per customer

========================
SETTINGS MODULE
========================

- Facebook page connect UI
- Webhook status indicator
- API health status
- Tenant settings

========================
ANALYTICS MODULE
========================

Must include:
- Total orders
- Revenue tracking (if available)
- Peak order time
- Top products
- Conversion rate

Use MongoDB aggregation pipelines.

========================
NOTIFICATION SYSTEM
========================

- Order created
- Order updated
- Webhook failure
- System logs

Store notifications in DB and emit via Socket.io.

========================
ERROR HANDLING
========================

- Retry failed BullMQ jobs
- Webhook retry mechanism
- AI fallback to rule parser
- Global error middleware

========================
PERFORMANCE & SECURITY
========================

- Add MongoDB indexes
- Use Redis caching where needed
- Rate limiting on APIs
- Secure webhook endpoints
- Tenant isolation strictly enforced

========================
FINAL RULE
========================

Ensure:
- Production-ready SaaS architecture
- Clean modular code
- No dummy or mock data
- Fully scalable system
- Real-world deployment readiness