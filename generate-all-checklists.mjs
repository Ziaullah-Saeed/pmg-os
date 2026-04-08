import PDFDocument from 'pdfkit';
import fs from 'fs';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType, TableLayoutType } from 'docx';

const CRIMSON = '#DC2626';
const NAVY = '#0F172A';
const DARK_GRAY = '#374151';
const MED_GRAY = '#6B7280';
const LIGHT_GRAY = '#E5E7EB';

const v2Sections = [
  {
    title: 'SECTION 0: LOGIN & AUTHENTICATION',
    subsections: [
      {
        subtitle: null,
        rows: [
          ['0.1', 'Navigate to app root URL', 'Login page loads without errors'],
          ['0.2', 'Login page shows email + password fields', 'Both input fields visible and accessible'],
          ['0.3', 'Login page has PMG branding', 'Logo or "PMG Group" text visible on login'],
          ['0.4', 'Submit empty login form', 'Validation error shown, no crash'],
          ['0.5', 'Submit wrong email', 'Error toast or inline error shown'],
          ['0.6', 'Submit wrong password', 'Error toast or inline error shown'],
          ['0.7', 'Login with valid credentials', 'Redirects to Dashboard (Command Center)'],
          ['0.8', 'Session persists on page refresh', 'After login, refreshing does not redirect to login'],
          ['0.9', 'Logout button in sidebar', 'Clicking logs out and redirects to login'],
          ['0.10', 'Unauthorized API call (logged out)', 'Returns 401, redirects to login'],
        ]
      }
    ]
  },
  {
    title: 'SECTION 1: GLOBAL LAYOUT & NAVIGATION',
    subsections: [
      {
        subtitle: '1A: Sidebar Navigation',
        rows: [
          ['1.1', 'Sidebar renders after login', 'Sidebar visible on left side'],
          ['1.2', 'Sidebar shows Dashboard link', '"Command Center" with LayoutDashboard icon'],
          ['1.3', 'Sidebar shows 6 main sections', 'Outreach, CRM, Marketing, Production, Admin, Finance'],
          ['1.4', 'Sidebar shows Settings link', 'Settings gear icon at bottom'],
          ['1.5', 'Sidebar section grouping labels', '"Revenue Engine" (Outreach, CRM), "Growth" (Marketing, Production), "Operations" (Admin, Finance)'],
          ['1.6', 'Sidebar collapse/expand toggle', 'Chevron button collapses sidebar to icon-only mode'],
          ['1.7', 'Collapsed sidebar shows icons only', 'Section labels hidden, only icons visible'],
          ['1.8', 'Active page highlighted in sidebar', 'Current page link has distinct styling (border, background)'],
          ['1.9', 'Click each sidebar link', 'Each navigates to correct page without error'],
          ['1.10', 'Sidebar mobile behavior', 'On small screens, sidebar becomes hamburger menu (Sheet)'],
          ['1.11', 'Mobile sidebar opens/closes', 'Sheet opens on hamburger click, closes on selection'],
          ['1.12', 'Logout button visible in sidebar', 'LogOut icon + "Logout" text at bottom of sidebar'],
        ]
      },
      {
        subtitle: '1B: Top Header Bar',
        rows: [
          ['1.13', 'Global Search bar visible', 'Search input with icon in top header'],
          ['1.14', 'Global Search opens overlay', 'Clicking search opens search results overlay'],
          ['1.15', 'Global Search returns results', 'Typing a query returns matching items across sections'],
          ['1.16', 'Notification Bell visible', 'Bell icon with unread count badge'],
          ['1.17', 'Notification Bell dropdown', 'Clicking shows dropdown with recent notifications'],
          ['1.18', 'Notification items display', 'Each notification shows title, description, timestamp'],
          ['1.19', '"Mark as Read" on notification', 'Individual notification can be marked read'],
          ['1.20', '"Mark All Read" button', 'Clears all unread notification badges'],
          ['1.21', 'Unread count updates', 'Badge count decreases when notifications are read'],
          ['1.22', 'Wallet Display visible', 'Shows current wallet balance in header'],
          ['1.23', 'Wallet balance value', 'Shows dollar amount (e.g., $355.02 or $360.29)'],
          ['1.24', 'AI Mode Toggle visible', 'Mode indicator in header with current mode label'],
          ['1.25', 'AI Mode Toggle clickable', 'Clicking opens mode selection dropdown/dialog'],
          ['1.26', 'AI Mode switch from header', 'Can switch between AI Auto / Hybrid / Human from header'],
        ]
      },
      {
        subtitle: '1C: Help Guide System',
        rows: [
          ['1.27', '[?] button visible per section', 'Help/guide button shown near each sidebar section'],
          ['1.28', 'Clicking [?] opens guide overlay', 'Card slideshow overlay opens with steps'],
          ['1.29', 'Guide overlay shows step content', 'Each step: heading, description, visual mockup'],
          ['1.30', 'Guide step navigation', 'Can navigate forward/backward through steps with Previous/Next'],
          ['1.31', 'Guide mode-aware tips', 'Colored tip box at bottom changes based on current AI mode'],
          ['1.32', 'Guide close button', 'X button or "Done" on last step closes overlay'],
          ['1.33', 'Guide content matches section', 'Outreach guide shows outreach steps, CRM shows CRM steps, etc.'],
          ['1.34', 'Guide available for all sections', 'Outreach, CRM, Marketing, Production, Admin, Finance, Settings all have guides'],
        ]
      },
      {
        subtitle: '1D: Mode Indicator Banner',
        rows: [
          ['1.35', 'AI Autonomous mode — no banner or crimson banner', 'No mode restriction banner (AI handles everything)'],
          ['1.36', 'Hybrid mode — yellow/blue banner', 'Banner indicates "Hybrid Mode — AI prepares, you review"'],
          ['1.37', 'Human mode — blue banner', 'Banner indicates "Manual Control — AI standby"'],
          ['1.38', 'Banner visible on every page', 'Mode banner appears on Dashboard, Outreach, CRM, etc.'],
          ['1.39', 'Banner disappears when switching to Auto', 'Switching to AI Autonomous removes banner or changes it'],
        ]
      }
    ]
  },
  {
    title: 'SECTION 2: DASHBOARD (Command Center)',
    subsections: [
      {
        subtitle: null,
        rows: [
          ['2.1', 'Dashboard loads without errors', 'No console errors, no blank screen'],
          ['2.2', 'Page title "Command Center"', 'Header shows "Command Center" with subtitle'],
          ['2.3', 'Mode badge in header', 'Shows current AI mode (AI Autonomous / Hybrid / Manual)'],
          ['2.4', 'KPI Card: Total Leads', 'Shows count of leads from API'],
          ['2.5', 'KPI Card: Qualified', 'Shows count of qualified leads'],
          ['2.6', 'KPI Card: Active Deals', 'Shows active (non-closed) opportunities'],
          ['2.7', 'KPI Card: Won Deals', 'Shows closed_won opportunity count'],
          ['2.8', 'KPI Card: Revenue', 'Shows total revenue from won deals (formatted $Xk)'],
          ['2.9', 'KPI Card: Pending Tasks', 'Shows incomplete task count'],
          ['2.10', 'Quick Actions section visible', 'Shows 4 action buttons in grid'],
          ['2.11', 'Quick Actions — AI Auto mode', '"Find Prospects", "View Pipeline", "Create Content", "Open Settings"'],
          ['2.12', 'Quick Actions — Human mode', '"Enter Prospects Manually" replaces "Find Prospects"'],
          ['2.13', 'Quick Action clicks navigate', 'Each button links to correct page (outreach, crm, production, settings)'],
          ['2.14', 'Quick Actions hover animation', 'Cards scale on hover (framer-motion)'],
          ['2.15', 'Pipeline Summary card', 'Shows pipeline stage breakdown with progress bars'],
          ['2.16', 'Pipeline stages listed', 'New Lead, Meeting Set, Discovery, Proposal, Negotiation, Won'],
          ['2.17', 'Pipeline bar widths', 'Bar widths proportional to deal count per stage'],
          ['2.18', 'Pipeline animated bars', 'Bars animate in on load (framer-motion)'],
          ['2.19', 'Top 3 deals shown', 'Up to 3 deals listed below pipeline bars'],
          ['2.20', 'Deal cards show name + stage + value', 'Each deal card: title, stage label, dollar amount'],
          ['2.21', 'Deal cards clickable', 'Clicking a deal navigates to /crm'],
          ['2.22', 'Deal mode badges — AI Auto', '"Auto-Advanced" badge on deals'],
          ['2.23', 'Deal mode badges — Hybrid', '"Review Required" badge'],
          ['2.24', 'Deal mode badges — Human', 'Stage name as badge'],
          ['2.25', '"View All" link to CRM', 'Pipeline card has "View All" button linking to /crm'],
          ['2.26', 'Empty pipeline state', 'If no deals: "No deals in pipeline yet" message + "Start Prospecting" button'],
          ['2.27', 'Recent Leads card', 'Shows up to 5 recent leads'],
          ['2.28', 'Lead items show name + company', 'Each lead: first/last name, company name'],
          ['2.29', 'Lead mode badges — AI Auto', '"AI Routed" badge on leads'],
          ['2.30', 'Lead mode badges — Hybrid', '"Needs Review" or "Reviewed" badge'],
          ['2.31', 'Lead mode badges — Human', 'Status name as badge'],
          ['2.32', 'Lead AI annotation — AI Auto', '"All leads auto-scored and routed by AI" text'],
          ['2.33', 'Lead AI annotation — Hybrid', '"AI scored — your approval needed" text'],
          ['2.34', 'Lead AI annotation — Human', '"Manual tracking — no AI processing" text'],
          ['2.35', 'Lead items clickable', 'Clicking leads navigates to /outreach'],
          ['2.36', '"View All" link to Outreach', 'Recent Leads has "View All" button linking to /outreach'],
          ['2.37', 'Empty leads state', 'If no leads: "No leads yet — start with Outreach" message'],
          ['2.38', 'System Status card', 'Shows 6 module status indicators'],
          ['2.39', 'System modules listed', 'AI Engine, Wallet, Outreach, CRM, Marketing, Production'],
          ['2.40', 'Module status dots', 'Green (active), pulsing (autonomous/hybrid), yellow (standby)'],
          ['2.41', 'Module status detail text — AI Auto', 'AI-specific descriptions (e.g., "Full auto — all agents active")'],
          ['2.42', 'Module status detail text — Hybrid', 'Hybrid descriptions (e.g., "AI + human review")'],
          ['2.43', 'Module status detail text — Human', 'Manual descriptions (e.g., "Manual only — AI standby")'],
          ['2.44', 'Dashboard responsive layout', 'Cards reflow on smaller screens (grid cols reduce)'],
        ]
      }
    ]
  },
  {
    title: 'SECTION 3: OUTREACH (6 Tabs / 6 Agents)',
    subsections: [
      { subtitle: '3A: Tab Navigation', rows: [['3.1','Outreach page loads','No errors, tab bar visible'],['3.2','6 tabs visible','Prospect Finder, Social Command, Strategy, Compose, Follow-ups, Analytics'],['3.3','Default tab selected','Prospect Finder selected on load'],['3.4','Clicking each tab','Content switches without errors'],['3.5','Active tab styling','Selected tab has distinct border/highlight'],['3.6','Tab animation','Content fades/slides in on tab switch (framer-motion)']] },
      { subtitle: '3B: Prospect Finder (Agent 1)', rows: [['3.7','"Find Prospects" button visible (AI Auto/Hybrid)','AI button shown when not in Human mode'],['3.8','"Find Prospects" button hidden (Human)','Button hidden or replaced in Human mode'],['3.9','Click "Find Prospects"','Loading state → toast with results (or fallback toast on error)'],['3.10','Prospect cards display','Each card: company name, fit score, accessibility score'],['3.11','Prospect cards show contact info','Company contact details visible'],['3.12','"Plan Approach" button per prospect','Triggers strategy generation → toast'],['3.13','"Save as Lead" button per prospect','Saves prospect to CRM → toast confirmation'],['3.14','"Save All to CRM" bulk button','Saves all prospects; individual buttons sync to "Saved" state'],['3.15','Loading spinners during AI calls','Spinner/loading indicator during processing'],['3.16','Error handling toast','If AI call fails, toast notification shows (not a crash)'],['3.17','"Create Lead" manual form','Manual entry form for adding a lead (available in Human mode)']] },
      { subtitle: '3C: Social Command Center (Agent 2)', rows: [['3.18','Unified inbox view loads','Shows messages from all connected channels'],['3.19','Message classification labels','Hot Lead 🔥 / Warm 🟡 / Cold ❄️ / Spam 🚫 labels'],['3.20','AI-prepared response drafts','Draft visible for each incoming message'],['3.21','"Send" button per message','Marks message as sent → toast confirmation'],['3.22','"Move to CRM" button','Appears on positive responses → creates lead → toast'],['3.23','Channel performance stats','Shows which channel brings most leads'],['3.24','Channel icons (LinkedIn, Email, Facebook)','Correct icons displayed per channel message']] },
      { subtitle: '3D: Strategy (Agent 3)', rows: [['3.25','Strategy cards display','Multi-channel sequence plan (Day 1, Day 3, etc.)'],['3.26','Decision chain mapping','Shows contact sequence: CEO → CTO → Marketing Director'],['3.27','"Draft Messages" button on strategy','Triggers message composition → toast'],['3.28','Strategy gated in Human mode','AI strategy buttons hidden or labeled differently']] },
      { subtitle: '3E: Compose (Agent 4)', rows: [['3.29','Personalized message drafts display','AI-written messages shown per channel'],['3.30','Messages reference prospect details','Company name, pain points mentioned (not generic)'],['3.31','"Review & Send" buttons per message','Each message has send action → toast'],['3.32','Tone adaptation by role','C-Suite = strategic, IT Directors = technical, Marketing = results'],['3.33','No forbidden words in output','No "leverage", "synergy", "cutting-edge", "game-changing"'],['3.34','Channel-specific formatting','LinkedIn DM vs Email vs Call Script formatted differently']] },
      { subtitle: '3F: Follow-ups (Agent 5)', rows: [['3.35','Follow-up reminders list','Shows upcoming follow-ups with timing'],['3.36','"Send Follow-up" button','Drafts follow-up referencing previous touchpoints → toast'],['3.37','Escalation logic visible','After 3 LinkedIn → suggests email → then phone'],['3.38','Signal detection display','Profile views, email opens shown as warm signals'],['3.39','"Move to CRM" button','Appears when prospect responds positively → toast'],['3.40','Follow-up status tracking','Sent, Pending, Scheduled, Overdue statuses shown']] },
      { subtitle: '3G: Analytics (Agent 6)', rows: [['3.41','Outreach metrics dashboard','Reply rates, open rates, acceptance rates per channel'],['3.42','Winner/loser identification','Insights like "Case study email: 34% reply vs 8% for intro"'],['3.43','Team tracking stats','Who sent what, conversion rates per person'],['3.44','Weekly report summary','Clear actions: "Increase LinkedIn, reduce cold email"'],['3.45','"Apply Recommendation" buttons','Clicking updates strategy → toast'],['3.46','Chart/graph rendering','Visual charts render without overflow or errors']] },
    ]
  },
  {
    title: 'SECTION 4: CRM (5 Tabs / 5 Agents)',
    subsections: [
      { subtitle: '4A: Tab Navigation', rows: [['4.1','CRM page loads','No errors, tab bar visible'],['4.2','5 tabs visible','Pipeline, Lead Qualification, Call Intelligence, Proposals, CRM Sync'],['4.3','Default tab selected','Pipeline selected on load'],['4.4','Clicking each tab','Content switches without errors']] },
      { subtitle: '4B: Pipeline (Agent 8)', rows: [['4.5','Pipeline view loads','Visual pipeline with stages'],['4.6','Pipeline stages shown','New Lead → Meeting Set → Discovery → Proposal → Negotiation → Won/Lost'],['4.7','Deal cards render','Cards in each column with deal name, company, value'],['4.8','Deal health indicators','🟢 Healthy / 🟡 Stale / 🔴 At Risk per deal'],['4.9','AI Pipeline Review (Sparkle button)','Click triggers AI analysis → toast with insights'],['4.10','AI Pipeline Review gated in Human mode','Button hidden when in Human mode'],['4.11','Deal detail panel','Clicking a deal opens detail drawer/panel'],['4.12','Deal detail shows notes','Contact notes, activity history visible'],['4.13','Deal stage progression','Can change deal stage from detail panel'],['4.14','Risk detection alerts','Warning badges: "champion silent", "competitor mentioned"'],['4.15','Next step recommendations','Specific: "Send ROI calculator to Sarah by Thursday"'],['4.16','"Create Proposal" button on deal','Triggers proposal generation → toast'],['4.17','"Mark Won" button','Changes stage to closed_won, shows success toast'],['4.18','"Mark Lost" button','Changes stage to closed_lost, records reason'],['4.19','Pipeline total value display','Shows total pipeline dollar value']] },
      { subtitle: '4C: Lead Qualification (Agent 7)', rows: [['4.20','Lead scoring display','5 dimensions: Fit, Need, Budget, Timing, Authority with weights'],['4.21','Score weights shown','Fit (30%), Need (25%), Budget (20%), Timing (15%), Authority (10%)'],['4.22','Category labels','🔥 Hot (80+) / 🟡 Warm (50-79) / ❄️ Cold (20-49) / 🚫 Disqualified (<20)'],['4.23','Score reasoning visible','Explanation why each score was assigned'],['4.24','"Set Meeting" button on hot leads','Triggers meeting prep → toast'],['4.25','Warm leads → nurture flow','Shows "Continue Follow-up" or routes to Agent 5'],['4.26','Lead list sortable/filterable','Can sort by score, filter by category']] },
      { subtitle: '4D: Call Intelligence (Agent 9)', rows: [['4.27','Pre-call briefing generates','"Prep for Meeting" creates full briefing → toast'],['4.28','Briefing content','Who they are, pain points, talking points, company research'],['4.29','Coaching cards displayed','"If they say X, respond with Y" format'],['4.30','Objection handling scripts','Budget, already-have-agency, send-me-info responses'],['4.31','"Upload Transcript" button','Upload Zoom transcript for AI analysis'],['4.32','Post-call analysis','Sentiment, decisions, action items, deal score'],['4.33','Follow-up email draft','Auto-drafted email after transcript analysis'],['4.34','"Send Follow-up" button','Sends drafted email → toast'],['4.35','Call Intelligence gated in Human mode','AI features hidden or limited']] },
      { subtitle: '4E: Proposals (Agent 10)', rows: [['4.36','"Create Proposal" generates proposal','Customized with scope, timeline, pricing → toast'],['4.37','Pricing tiers displayed','Starter ($2,500) / Growth ($5,000) / Enterprise ($10,000)'],['4.38','Proposal preview','Full preview visible before sending'],['4.39','"Send Proposal" button','Marks as sent → toast'],['4.40','Proposal status tracking','Sent → Viewed → Under Review → Accepted → Rejected'],['4.41','"Generate Contract" button','Appears after proposal accepted → toast'],['4.42','Renewal alerts','60-day alerts before contract expiration']] },
      { subtitle: '4F: CRM Sync (Agent 11)', rows: [['4.43','GHL sync status displayed','Shows connection status to GoHighLevel'],['4.44','HubSpot sync status displayed','Shows connection status'],['4.45','"Partner Close" flag on deals','Flag deal → auto-pushes to GHL sub-account'],['4.46','Bidirectional sync indicator','Changes in either system update the other'],['4.47','Sync error queue','Failed syncs shown with retry option'],['4.48','"View in GHL" link','Button present (may not open external in demo)'],['4.49','Last sync timestamp','Shows "Last sync: X min ago"']] },
    ]
  },
  {
    title: 'SECTION 5: MARKETING (5 Tabs / 5 Agents)',
    subsections: [
      { subtitle: '5A: Tab Navigation', rows: [['5.1','Marketing page loads','No errors, tab bar visible'],['5.2','5 tabs visible','Content Strategy, Campaigns, SEO & Growth, Orchestrator, Competitor Intel'],['5.3','Default tab selected','Content Strategy on load'],['5.4','Clicking each tab','Content switches without errors']] },
      { subtitle: '5B: Content Strategy (Agent 12)', rows: [['5.5','Content calendar view','Shows planned content across channels'],['5.6','Channel breakdown','LinkedIn (3/wk), Facebook/IG (5/wk), Blog (2/mo), X (daily), YouTube (2/mo)'],['5.7','"Create Content" / "AI Content Plan" button','Opens content creation flow or generates plan → toast'],['5.8','Content preview','Generated content shown with preview'],['5.9','"Write" / AI generate button per content','AI drafts content for specific item → toast'],['5.10','Content status flow','Draft → Review → Approved → Published visible'],['5.11','"Publish" button per content','Changes status to Published → toast'],['5.12','Content repurposing indicators','1 blog → LinkedIn + social posts + email + video suggestion'],['5.13','Content generation gated in Human mode','AI creation buttons hidden']] },
      { subtitle: '5C: Campaigns (Agent 13)', rows: [['5.14','"Create Campaign" button','Opens campaign builder → toast'],['5.15','Campaign targets','Facebook / LinkedIn / Google / YouTube options'],['5.16','Campaign package display','Copy, targeting, budget, schedule, A/B variations'],['5.17','"Review" → "Launch" flow','Manual launch only (never auto-publishes)'],['5.18','Performance tracking metrics','Cost per lead, cost per meeting, ROAS per platform'],['5.19','Budget awareness','Shows budget limits ($600 campaign budget)'],['5.20','Campaign list with statuses','Active / Paused / Draft campaigns listed']] },
      { subtitle: '5D: SEO & Growth (Agent 14)', rows: [['5.21','"Run SEO Audit" button','Generates website audit report → toast'],['5.22','SEO audit scores display','Visual scores for website performance areas'],['5.23','Keyword research results','Keywords with intent + competition levels'],['5.24','Ranked fixes list','Specific tasks ordered by impact'],['5.25','"Create Content" per keyword gap','Each gap has button to trigger content creation → toast'],['5.26','Ranking/traffic tracking','Position and organic traffic trends'],['5.27','SEO audit gated in Human mode','AI audit button hidden']] },
      { subtitle: '5E: Orchestrator (Agent 15)', rows: [['5.28','"Plan Campaign" button','Creates multi-channel coordinated plan → toast'],['5.29','Timeline view','Week 1 awareness → Week 2 engagement → Week 3 conversion'],['5.30','Full journey tracking','Impression → visit → form → lead → meeting → client'],['5.31','Weekly campaign report','Performance data with recommendations']] },
      { subtitle: '5F: Competitor Intel (Agent 16)', rows: [['5.32','"Refresh Competitor Analysis" button','Runs competitor scan → toast'],['5.33','Competitive battle cards','Talking points against each competitor'],['5.34','Gap identification','"No competitor offers lead generation guarantees"'],['5.35','Competitor alerts','Notifications on competitor moves']] },
    ]
  },
  {
    title: 'SECTION 6: PRODUCTION (9 Tabs / 8 Agents)',
    subsections: [
      { subtitle: '6A: Tab Navigation', rows: [['6.1','Production page loads','No errors, tab bar visible'],['6.2','9 tabs visible','Onboarding, Marketing Audit, Creative, Lead Gen, Campaigns, Reporting, CRM Sync, Quality Review, Client Deliverables'],['6.3','Default tab selected','Onboarding on load'],['6.4','Clicking each tab','Content switches without errors'],['6.5','ModeIndicator visible','Mode badge in production header']] },
      { subtitle: '6B: Client Onboarding (Agent 17)', rows: [['6.6','Onboarding checklist loads','7-step checklist visible'],['6.7','Steps listed','Collect brand assets, Get access, Define audience, Document services, Set goals, Choose CRM, Configure sync'],['6.8','Progress bar','Shows completion percentage'],['6.9','"Complete Step" buttons','Each step has completion button → toast'],['6.10','Sequential unlocking','Steps unlock in order after previous completed'],['6.11','"Run Audit" after all steps','Button appears after 100% completion'],['6.12','AI Onboarding Assistance button','Visible in AI Auto/Hybrid, hidden in Human'],['6.13','Mode awareness','Different behavior per AI mode']] },
      { subtitle: '6C: Marketing Audit (Agent 18)', rows: [['6.14','Audit scores display','Website, Social, Ads, Email, SEO scores (0-100)'],['6.15','Score color coding','Green (70+), yellow (40-69), red (<40)'],['6.16','"Run Full Audit" button','Triggers comprehensive audit → toast'],['6.17','"Generate Fix Plan" button','Creates prioritized action plan → toast'],['6.18','Audit gated in Human mode','AI audit buttons hidden']] },
      { subtitle: '6D: Creative Production (Agent 19)', rows: [['6.19','Asset type selection','Image, Video, Document, Branding selectable'],['6.20','Type highlights on selection','Selected type has visual indicator'],['6.21','Prompt text area','Description field for what to generate'],['6.22','"Generate" button','Calls AI → loading → preview → toast'],['6.23','Preview display','Generated content shown with preview'],['6.24','Download buttons','PNG/JPG, MP4, PDF/DOCX format options'],['6.25','Generation gated in Human mode','AI generation buttons hidden']] },
      { subtitle: '6E: Lead Generator (Agent 20)', rows: [['6.26','"Generate Leads" button','Creates 20 qualified leads per client → toast'],['6.27','Lead cards display','Company, decision maker, contact, pain points, score (80+)'],['6.28','"Push to Client CRM" button','Syncs leads to client GHL/HubSpot → toast'],['6.29','"Add to PMG Pipeline" button','Adds leads to internal CRM → toast'],['6.30','Lead generation gated in Human mode','AI generation buttons hidden']] },
      { subtitle: '6F: Campaigns & Funnels (Agent 21)', rows: [['6.31','Campaign list loads','Shows campaigns with status badges'],['6.32','Status toggles','Active (green) / Paused (yellow) / Draft (gray)'],['6.33','"Launch" button','Changes status to Active → toast'],['6.34','"Pause" / "Resume" buttons','Toggle campaign state → toast'],['6.35','"View Funnel" expands','Shows Ad → Landing → Form → Nurture → Call'],['6.36','"AI Build Funnel" button','Creates complete funnel → toast'],['6.37','Funnel builder gated in Human mode','AI button hidden']] },
      { subtitle: '6G: Reporting (Agent 22)', rows: [['6.38','"Generate Report" button','Creates performance report → toast'],['6.39','Report format options','Executive (1-page) vs Detailed (full data)'],['6.40','Report sections','Leads, content, campaigns, pipeline, ROI calculation'],['6.41','"Send to Client" button','Delivers report → toast'],['6.42','PDF export','Download report as PDF'],['6.43','ROI calculation','Shows "$150K pipeline from $5K spend = 30x ROI"']] },
      { subtitle: '6H: Client CRM Sync (Agent 23)', rows: [['6.44','Client CRM connections listed','GHL main, GHL sub-accounts, HubSpot'],['6.45','Sync status per client','Connected / Disconnected with last sync time'],['6.46','"Sync Now" button','Triggers manual sync → toast'],['6.47','Sync error handling','Failed syncs shown with retry option']] },
      { subtitle: '6I: Quality Review (Agent 24)', rows: [['6.48','Content items with quality scores','Ready to Publish / Needs Minor Edits / Needs Rewrite'],['6.49','Quality score color coding','Green (ready), yellow (minor edits), red (rewrite)'],['6.50','"Approve & Publish" button','Changes badge to green "Published" → toast'],['6.51','"Auto-Fix" button','AI fixes minor issues → toast'],['6.52','"Auto-Fix" gated in Human mode','Button hidden in manual mode'],['6.53','"Regenerate" button','Calls AI to create new version → toast'],['6.54','Human tone check indicator','Shows if content sounds AI-generated'],['6.55','Brand consistency check','Correct logos, colors, voice indicators']] },
    ]
  },
  {
    title: 'SECTION 7: ADMIN (4 Tabs / 4 Agents)',
    subsections: [
      { subtitle: '7A: Tab Navigation', rows: [['7.1','Admin page loads','No errors, tab bar visible'],['7.2','4 tabs visible','Operations, Knowledge Base, Executive Briefing, System Evolution'],['7.3','Default tab selected','Operations on load'],['7.4','Clicking each tab','Content switches without errors'],['7.5','ModeIndicator visible','Mode badge in admin header']] },
      { subtitle: '7B: Operations (Agent 25)', rows: [['7.6','Task dashboard loads','Shows task cards with assignments'],['7.7','Task count displayed','12 tasks visible'],['7.8','Task cards show details','Title, assignee, priority, status per card'],['7.9','Task priority indicators','High / Medium / Low with color coding'],['7.10','"Mark Complete" button per task','Completes task → toast "Task Completed"'],['7.11','Completed task visual change','Completed tasks show checkmark or strikethrough'],['7.12','"Auto-Assign" AI button','Redistributes tasks → toast "Tasks Auto-Assigned"'],['7.13','"Auto-Assign" gated in Human mode','Button hidden in manual mode'],['7.14','"Add Task" button','Creates new task → toast "New Task"'],['7.15','Team member assignments shown','3 team members: Shershah, AI Outreach, AI Content'],['7.16','Overdue task flagging','Overdue items highlighted distinctly']] },
      { subtitle: '7C: Knowledge Base (Agent 26)', rows: [['7.17','Knowledge base loads','Shows 24 documents organized by category'],['7.18','Category chips/filters','Clickable category buttons to filter docs'],['7.19','Search field','Type query → filters documents'],['7.20','Click category → filters results','Only matching documents shown'],['7.21','Document cards display','Title, category, date per document'],['7.22','"View" button per document','Opens document → toast "Document Opened"'],['7.23','"Auto-Update" AI button','Updates knowledge base → toast "Knowledge Base Updated"'],['7.24','"Auto-Update" gated in Human mode','Button hidden in manual mode'],['7.25','Document count per category','Shows number of docs in each category']] },
      { subtitle: '7D: Executive Briefing (Agent 27)', rows: [['7.26','Morning briefing loads','Displays executive briefing content'],['7.27','Urgent items section','3 urgent items shown (e.g., "Invoice Overdue", "Contract Expiring")'],['7.28','Today\'s priorities section','4 priorities listed'],['7.29','Recent wins section','4 wins displayed'],['7.30','Key metrics display','6 business metrics shown'],['7.31','"Go to" action buttons per item','Each urgent/priority item has action button → toast'],['7.32','"Regenerate Briefing" button','Refreshes briefing data → toast "Briefing Regenerated"'],['7.33','"Generate Morning Briefing" header button','Triggers generation → toast'],['7.34','Briefing generation gated in Human mode','AI generation buttons hidden']] },
      { subtitle: '7E: System Evolution (Agent 28)', rows: [['7.35','"What\'s New" report loads','Shows tech updates and recommendations'],['7.36','8 system evolution items','Technology updates displayed'],['7.37','"Approve" button per recommendation','Queues for implementation → toast'],['7.38','"Explore Later" button','Schedules for evaluation → toast'],['7.39','"Skip" button','Dismisses recommendation → toast'],['7.40','"Scan for Updates" AI button','Triggers scan → toast "Scan Complete"'],['7.41','"Scan for Updates" gated in Human mode','Button hidden in manual mode'],['7.42','Update impact/relevance indicators','Priority or impact level per update']] },
    ]
  },
  {
    title: 'SECTION 8: FINANCE (2 Tabs / 2 Agents)',
    subsections: [
      { subtitle: '8A: Tab Navigation', rows: [['8.1','Finance page loads','No errors, tab bar visible'],['8.2','2 tabs visible','Billing & Revenue, Contracts & Expenses'],['8.3','Default tab selected','Billing & Revenue on load'],['8.4','Clicking each tab','Content switches without errors'],['8.5','ModeIndicator visible','Mode badge in finance header'],['8.6','Header "New Invoice" button','Clicking shows toast about creating invoice']] },
      { subtitle: '8B: Billing & Revenue (Agent 29)', rows: [['8.7','Invoice list loads','8 invoices displayed'],['8.8','Invoice details per row','ID, client, amount, status, date'],['8.9','Invoice status badges','Paid (green), Sent (blue), Overdue (red), Draft (gray)'],['8.10','MRR metric displayed','$17,500 Monthly Recurring Revenue'],['8.11','Revenue breakdown per client','Shows revenue attribution per client'],['8.12','"Send Invoice" button per invoice','Sends invoice → toast'],['8.13','"Send Reminder" button (overdue)','Sends payment reminder → toast'],['8.14','"View" button per invoice','Opens invoice preview → toast'],['8.15','"Download" button per invoice','Downloads PDF → toast'],['8.16','"Auto-Generate Monthly" AI button','Generates monthly invoices → toast'],['8.17','"Auto-Generate Monthly" gated in Human mode','Button hidden in manual mode'],['8.18','"Create Invoice" manual button','Shows "coming soon" or creation toast'],['8.19','Client profitability section','Revenue minus cost per client']] },
      { subtitle: '8C: Contracts & Expenses (Agent 30)', rows: [['8.20','Contract list loads','4 contracts displayed'],['8.21','Contract details','Client, package tier, monthly value, start/end dates'],['8.22','Contract expiring alert','1 contract flagged as expiring soon'],['8.23','"Renew" button on expiring contract','Sends renewal proposal → toast'],['8.24','"View Contract" button','Opens contract details → toast'],['8.25','"Draft Contract" AI button','Drafts new contract → toast'],['8.26','"Draft Contract" gated in Human mode','Button hidden in manual mode'],['8.27','Expense tracking display','4 categories: AI tools, advertising, software, team'],['8.28','Expense total','$516/mo total expenses'],['8.29','Monthly P&L report','Revenue vs expenses breakdown'],['8.30','Revenue forecasting','4 scenarios displayed'],['8.31','Scenario modeling','"If we close X deals, revenue = $Y"'],['8.32','"Run Scenario Analysis" AI button','Calculates projections → toast'],['8.33','Upsell suggestions','Based on client performance data']] },
    ]
  },
  {
    title: 'SECTION 9: SETTINGS (10 Tabs)',
    subsections: [
      { subtitle: '9A: Tab Navigation', rows: [['9.1','Settings page loads','No errors, 10 tabs visible'],['9.2','All 10 tabs listed','General, AI Modes, Wallet, Users & Roles, Channels, Integrations, API Keys, Legal & Compliance, Notifications, System Health'],['9.3','Default tab selected','General on load'],['9.4','Clicking each tab','Content switches without errors'],['9.5','Tab icons render','Each tab has distinct icon']] },
      { subtitle: '9B: General Tab', rows: [['9.6','Company logo placeholder','PMG shield logo displayed'],['9.7','"Upload Logo" button','Button present and clickable'],['9.8','Company Name field','Pre-filled "PMG Group LLC", editable'],['9.9','Website field','Pre-filled "https://pmggroup-llc.com", editable'],['9.10','Industry Focus field','"Cybersecurity & IT Services", read-only'],['9.11','Timezone dropdown','Select from EST, CST, MST, PST, UTC'],['9.12','Brand Identity colors','4 color swatches: Primary (Crimson), Background (Navy), Text (White), Accent (Gold)'],['9.13','Color hex values','#DC2626, #0F172A, #F8FAFC, #F59E0B displayed'],['9.14','Font settings','Primary Font (Inter), Display Font (Clash Display)'],['9.15','Brand Voice section','Tone, Terminology, Forbidden Words, Content Rule'],['9.16','Forbidden words listed','"leverage, synergy, cutting-edge, game-changing, innovative"'],['9.17','"Save Changes" button','Premium-styled button at bottom']] },
      { subtitle: '9C-9K: Remaining Tabs', rows: [['9.18-9.27','AI Modes Tab','3 mode cards, per-section overrides, checkmark on active'],['9.28-9.38','Wallet Tab','Balance, spent, budget, 4 pools, spending controls'],['9.39-9.44','Users & Roles Tab','Invite user, current user card, 4 role definitions'],['9.45-9.52','Channels Tab','6 channels, connection status, anti-spam toggles'],['9.53-9.56','Integrations Tab','6 integrations with Configure buttons'],['9.57-9.62','API Keys Tab','6 services, Required/Optional badges, cost estimates'],['9.63-9.71','Legal & Compliance Tab','CAN-SPAM, GDPR, TCPA, contract templates, opt-out'],['9.72-9.75','Notifications Tab','Per-category toggles (In-App/Email/Slack)'],['9.76-9.85','System Health Tab','32 agent statuses, API health, DB stats, Run Health Check']] },
    ]
  },
  {
    title: 'SECTION 10: AI MODE BEHAVIOR (Cross-Cutting)',
    subsections: [
      { subtitle: '10A: Mode Switching', rows: [['10.1','Switch to AI Autonomous via Settings','All pages reflect AI Auto mode'],['10.2','Switch to Hybrid via Settings','All pages reflect Hybrid mode'],['10.3','Switch to Human via Settings','All pages reflect Human mode'],['10.4','Switch via header toggle','Mode changes immediately across app'],['10.5','Mode persists on page navigation','Switching pages retains current mode'],['10.6','Mode persists on page refresh','Refreshing browser retains mode (API-backed)']] },
      { subtitle: '10B: AI Autonomous Verification', rows: [['10.7','Dashboard — no restriction banner','No "human controlled" or "hybrid" banner'],['10.8','All AI buttons visible','Find Prospects, Generate Leads, Auto-Assign, etc. all showing'],['10.9','Bot icons visible','AI automation badges and icons shown'],['10.10','"AI Routed" / "Auto-Advanced" badges','Leads and deals show AI processing badges']] },
      { subtitle: '10C: Hybrid Mode Verification', rows: [['10.11','Banner indicates Hybrid mode','Yellow/blue banner on pages'],['10.12','AI buttons still visible','All AI action buttons accessible'],['10.13','"Needs Review" / "Review Required" badges','Items show review-needed status'],['10.14','Human approval indicators','Some items marked as needing human sign-off']] },
      { subtitle: '10D: Human Controlled Verification', rows: [['10.15','Banner indicates Manual Control','Blue banner on pages'],['10.16','AI automation buttons HIDDEN','Find Prospects, Generate Leads, AI Build Funnel, Auto-Assign, Auto-Generate Monthly, Draft Contract, Scan for Updates, Auto-Update, Generate Morning Briefing — all hidden'],['10.17','Manual alternatives available','"Enter Prospects Manually" instead of "Find Prospects"'],['10.18','Context-specific AI helpers also hidden','Generate Fix Plan, Auto-Fix Quality — hidden'],['10.19','View/Read-only features still work','Viewing invoices, documents, contracts still available'],['10.20','Manual action buttons still work','"Mark Complete", "View", "Download" still clickable']] },
    ]
  },
  {
    title: 'SECTION 11: WALLET & BUDGET SYSTEM',
    subsections: [{ subtitle: null, rows: [['11.1','Wallet balance in header','Shows dollar amount at all times'],['11.2','Wallet balance stays static in dummy mode','Balance doesn\'t actually deduct'],['11.3','Wallet display across all pages','Visible on Dashboard, Outreach, CRM, Marketing, etc.'],['11.4','Wallet tab in Settings','Full wallet breakdown accessible'],['11.5','Budget pool visualization','4 pools with progress bars'],['11.6','Spending controls functional','Auto-pause toggle, threshold input work'],['11.7','Transaction history','Past wallet transactions viewable']] }]
  },
  {
    title: 'SECTION 12: BUTTON-TO-BUTTON FLOW (E2E Chains)',
    subsections: [{ subtitle: null, rows: [['12.1','Outreach full chain','Find Prospects → Plan → Draft → Send → Follow-up → Move to CRM — all produce toasts'],['12.2','CRM full chain','Lead → Score → Meeting → Prep Call → Transcript → Proposal → Send → Won — all produce toasts'],['12.3','Production full chain','Won → Onboarding → Audit → Create → Quality Review → Publish — all produce toasts'],['12.4','Finance chain','Create Invoice → Send → Track Payment → Revenue Dashboard — all produce toasts'],['12.5','Admin chain','Generate Briefing → Go to action → Complete Task — all produce toasts'],['12.6','No dead-end buttons','Every button leads to a next action, toast, or clear result'],['12.7','No "undefined" or "null" in toasts','All toast messages show meaningful content'],['12.8','No blank/empty toast messages','Every toast has title and description']] }]
  },
  {
    title: 'SECTION 13: CONTENT & TERMINOLOGY STANDARDS',
    subsections: [{ subtitle: null, rows: [['13.1','No "leverage" in any UI text','Word not present in static or generated text'],['13.2','No "synergy" in any UI text','Word not present'],['13.3','No "cutting-edge" in any UI text','Word not present'],['13.4','No "game-changing" in any UI text','Word not present'],['13.5','No "innovative" in any UI text','Word not present'],['13.6','NIST referenced correctly','Used in industry context'],['13.7','SOC 2 referenced correctly','Used in compliance context'],['13.8','SIEM, EDR, MDR, XDR terminology','Used naturally in cybersecurity context'],['13.9','Pricing tiers consistent','Starter $2,500 / Growth $5,000 / Enterprise $10,000 everywhere'],['13.10','Sample client names consistent','SecureNet Solutions, CyberShield IT, DataVault MSP, Fortress Cybersecurity, ShieldOps Inc'],['13.11','"20 deals" promise visible','Core guarantee referenced in Production/Reporting'],['13.12','Human tone in all content','No AI-sounding fluff in any text']] }]
  },
  {
    title: 'SECTION 14: ERROR HANDLING & EDGE CASES',
    subsections: [
      { subtitle: '14A: API Error Handling', rows: [['14.1','AI call with 403 response','Falls back to hardcoded toast, no crash'],['14.2','All mutation onError handlers','Every mutation has onError with realistic toast'],['14.3','Network timeout','Shows error toast, not infinite spinner'],['14.4','401 unauthorized','Redirects to login page'],['14.5','API server down','Shows connection error, app doesn\'t crash']] },
      { subtitle: '14B: UI Edge Cases', rows: [['14.6','Double-click prevention on buttons','Buttons disabled during pending state'],['14.7','Empty input validation','Empty form submissions show validation errors'],['14.8','Page refresh mid-flow','State recovered or gracefully handled'],['14.9','Empty states for all lists','All lists show "no data" message when empty'],['14.10','Long text truncation','Long names/descriptions truncated with ellipsis'],['14.11','Content doesn\'t overflow containers','No horizontal scrollbar on content areas'],['14.12','Tab animation transitions','No flickering or jarring tab switches']] },
      { subtitle: '14C: Browser & Responsive', rows: [['14.13','Chrome rendering','All features work in Chrome'],['14.14','No console errors on load','Clean console (no red errors) on page load'],['14.15','No "Illegal constructor" errors','No native API conflicts'],['14.16','Desktop layout (1280px+)','Full sidebar, multi-column grids'],['14.17','Tablet layout (~768px)','Sidebar collapses, grids reduce columns'],['14.18','Mobile layout (~375px)','Hamburger menu, single column, no overflow'],['14.19','Dark theme consistent','Navy/dark background across all pages'],['14.20','Crimson accent color used','Primary actions, CTAs use crimson (#DC2626)'],['14.21','Glass-card styling','Glass morphism effect on cards (border, backdrop)'],['14.22','Framer Motion animations','Page transitions and element loads animated']] },
    ]
  },
];

function generateV2PDF() {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 40, right: 40 }, bufferPages: true });
  const out = fs.createWriteStream('PMG-OS-Checklist-V2.pdf');
  doc.pipe(out);

  doc.rect(0, 0, doc.page.width, 110).fill(NAVY);
  doc.fontSize(26).fill('#FFFFFF').font('Helvetica-Bold').text('PMG GROUP OS', 40, 25, { align: 'center' });
  doc.fontSize(12).fill('#F87171').text('Complete Testing & Verification Checklist v2', { align: 'center' });
  doc.fontSize(9).fill('#94A3B8').text('Based on Blueprint v2 + v3 | 6 Sections · 32 Agents · 3 AI Modes · 250+ Test Items', { align: 'center' });
  doc.y = 125;

  doc.fontSize(9).fill(DARK_GRAY).font('Helvetica-Bold').text('Login: ');
  doc.font('Helvetica').text('shershah_nawabi@pmggroup-llc.com / PMGAdmin2024!');
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text('Status: ');
  doc.font('Helvetica').text('PASS = Works as expected | PARTIAL = Cosmetic issues | FAIL = Broken/missing | N/A = Not applicable');
  doc.moveDown(0.3);
  doc.text('Test each item in all 3 AI modes: AI Autonomous, Hybrid, Human Controlled');
  doc.moveDown(0.8);

  for (const section of v2Sections) {
    if (doc.y > doc.page.height - 100) doc.addPage();
    const sy = doc.y;
    doc.rect(40, sy, doc.page.width - 80, 24).fill(CRIMSON);
    doc.fontSize(11).fill('#FFFFFF').font('Helvetica-Bold').text(section.title, 50, sy + 6);
    doc.y = sy + 32;

    for (const sub of section.subsections) {
      if (sub.subtitle) {
        if (doc.y > doc.page.height - 80) doc.addPage();
        doc.fontSize(10).fill(NAVY).font('Helvetica-Bold').text(sub.subtitle);
        doc.moveDown(0.3);
      }

      const colWidths = [35, 200, 220, 60];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = 40;

      if (doc.y > doc.page.height - 60) doc.addPage();
      let y = doc.y;
      doc.rect(startX, y, tableWidth, 16).fill('#1E293B');
      const headers = ['#', 'Test', 'Expected Result', 'Status'];
      let x = startX;
      headers.forEach((h, i) => {
        doc.fontSize(7).fill('#FFFFFF').font('Helvetica-Bold').text(h, x + 3, y + 4, { width: colWidths[i] - 6 });
        x += colWidths[i];
      });
      doc.y = y + 16;

      for (let ri = 0; ri < sub.rows.length; ri++) {
        const row = sub.rows[ri];
        const rowH = Math.max(16, Math.ceil(doc.heightOfString(row[1], { width: colWidths[1] - 6, fontSize: 7 }) + 6), Math.ceil(doc.heightOfString(row[2], { width: colWidths[2] - 6, fontSize: 7 }) + 6));
        if (doc.y + rowH > doc.page.height - 50) doc.addPage();
        y = doc.y;
        const bg = ri % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
        doc.rect(startX, y, tableWidth, rowH).fill(bg);
        doc.rect(startX, y, tableWidth, rowH).lineWidth(0.3).strokeColor('#E2E8F0').stroke();

        x = startX;
        doc.fontSize(7).fill(CRIMSON).font('Helvetica-Bold').text(row[0], x + 3, y + 4, { width: colWidths[0] - 6 });
        x += colWidths[0];
        doc.fill(DARK_GRAY).font('Helvetica-Bold').text(row[1], x + 3, y + 4, { width: colWidths[1] - 6 });
        x += colWidths[1];
        doc.fill(MED_GRAY).font('Helvetica').text(row[2], x + 3, y + 4, { width: colWidths[2] - 6 });
        x += colWidths[2];
        doc.rect(x, y, colWidths[3], rowH).lineWidth(0.3).strokeColor('#E2E8F0').stroke();
        doc.y = y + rowH;
      }
      doc.moveDown(0.5);
    }
    doc.moveDown(0.3);
  }
  doc.end();
  return new Promise(r => out.on('finish', r));
}

function buildTableRows(rows) {
  const result = [];
  result.push(new TableRow({
    tableHeader: true,
    children: ['#', 'Test', 'Expected Result', 'Status'].map((h, i) => new TableCell({
      width: { size: [8, 38, 42, 12][i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: '1E293B' },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 16, font: 'Arial' })] })],
    })),
  }));

  rows.forEach((row, ri) => {
    result.push(new TableRow({
      children: [
        new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: row[0], bold: true, color: 'DC2626', size: 16, font: 'Arial' })] })] }),
        new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: row[1], bold: true, size: 16, font: 'Arial' })] })] }),
        new TableCell({ width: { size: 42, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }, children: [new Paragraph({ children: [new TextRun({ text: row[2], size: 16, color: '6B7280', font: 'Arial' })] })] }),
        new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }, children: [new Paragraph({ text: '' })] }),
      ],
    }));
  });
  return result;
}

async function generateV2Word() {
  const children = [];
  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'PMG GROUP OS', bold: true, size: 52, color: '0F172A', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Complete Testing & Verification Checklist v2', size: 28, color: 'DC2626', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Based on Blueprint v2 + v3 | 6 Sections · 32 Agents · 3 AI Modes · 250+ Test Items', size: 18, color: '6B7280', font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Login: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: 'shershah_nawabi@pmggroup-llc.com / PMGAdmin2024!', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Status Options: ', bold: true, size: 20, font: 'Arial' }), new TextRun({ text: 'PASS = Works exactly | PARTIAL = Cosmetic issues | FAIL = Broken/missing | N/A = Not applicable', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Test each item in all 3 AI modes: AI Autonomous, Hybrid, Human Controlled', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));

  for (const section of v2Sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: section.title, bold: true, size: 28, color: 'DC2626', font: 'Arial' })] }));

    for (const sub of section.subsections) {
      if (sub.subtitle) {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: sub.subtitle, bold: true, size: 24, color: '0F172A', font: 'Arial' })] }));
      }
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: buildTableRows(sub.rows),
      }));
      children.push(new Paragraph({ text: '' }));
    }
  }

  const docx = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(docx);
  fs.writeFileSync('PMG-OS-Checklist-V2.docx', buf);
}

async function generateDetailedWord() {
  const children = [];
  children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'PMG GROUP OS', bold: true, size: 52, color: '0F172A', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Complete Testing & Verification Checklist — Detailed Version', size: 28, color: 'DC2626', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: '32 Agents | 6 Sections | 3 AI Modes | 75+ Detailed Test Items with Full Mode Descriptions', size: 18, color: '6B7280', font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Login Credentials:', bold: true, size: 22, font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Email: shershah_nawabi@pmggroup-llc.com', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Password: PMGAdmin2024!', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));

  children.push(new Paragraph({ children: [new TextRun({ text: 'HOW TO USE THIS DOCUMENT', bold: true, size: 24, color: '0F172A', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Each test item includes a detailed explanation of how the feature works, what it should do in each of the 3 AI modes, and a pre-generated answer describing what PASS, PARTIAL, and FAIL look like. Simply test the feature, then write your result.', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'STATUS OPTIONS:', bold: true, size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'PASS - Works exactly as described | PARTIAL - Works but has cosmetic issues | FAIL - Broken, missing, or does nothing | N/A - Not applicable', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));

  children.push(new Paragraph({ children: [new TextRun({ text: 'THE 3 AI MODES EXPLAINED', bold: true, size: 24, color: '0F172A', font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'AI AUTONOMOUS MODE', bold: true, size: 22, color: 'DC2626', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'The system runs AI agents automatically without asking you first. No yellow or blue banners appear at the top of pages. All AI buttons are visible and active. When you click "Find Prospects" or "Create Content", the AI runs immediately and stores the result. You get notified when something is done. High-confidence actions may execute without you clicking anything. Best for: when you trust the AI and want maximum speed.', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'HYBRID MODE (DEFAULT)', bold: true, size: 22, color: 'D97706', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'A YELLOW banner appears at the top of each page saying "Hybrid Mode". Items show badges: "AI" (generated by AI), "Human" (needs your input), "Review" (needs your approval). When AI confidence is high (above 80%), it executes automatically. When confidence is low (below 50%), the item gets queued in "Pending Actions" for your review. Best for: balanced control where AI helps but you make final decisions.', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'HUMAN CONTROLLED MODE', bold: true, size: 22, color: '3B82F6', font: 'Arial' })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'A BLUE banner appears at the top of each page saying "Human Controlled". Some AI buttons are hidden entirely since you are doing the work yourself. AI is available only as a tool when YOU choose to use it. Best for: when you want full manual control and use AI only for specific tasks.', size: 20, font: 'Arial' })] }));
  children.push(new Paragraph({ text: '' }));

  const { testItems } = await import('./generate-checklist-pdf.mjs').catch(() => ({ testItems: null }));

  const detailedSections = [
    { section: '0. LOGIN & GLOBAL LAYOUT', items: [
      { num: '0.1', title: 'Login with admin credentials', how: 'Go to the app URL. Enter email and password on the login screen. The system authenticates against the database, creates a session cookie, and redirects you to the Dashboard.', ai: 'Login works identically in all modes. After login you land on the Dashboard with no mode banner.', hybrid: 'Login works identically. After login you see the Dashboard with a yellow "Hybrid Mode" banner.', human: 'Login works identically. After login you see the Dashboard with a blue "Human Controlled" banner.', expected: 'PASS if you see the Dashboard after entering credentials. FAIL if you get an error message or stay on the login screen.' },
      { num: '0.2', title: 'Sidebar shows all 7 navigation items', how: 'The left sidebar displays 7 items grouped under labels: "Main" (Dashboard), "Revenue Engine" (Outreach + CRM), "Growth" (Marketing + Production), "Operations" (Admin + Finance), and Settings at bottom. Each is clickable.', ai: 'All sections visible. No items hidden based on mode.', hybrid: 'All sections visible.', human: 'All sections visible.', expected: 'PASS if all 7 items visible and clickable. FAIL if any section missing.' },
      { num: '0.3', title: 'Global Search', how: 'Search icon in top bar. Opens overlay. Type keyword to search across all sections. Results should be clickable and navigate to matching item.', ai: 'Search works identically in all modes. Results include AI-generated items.', hybrid: 'Same. May include items pending review.', human: 'Same. Fewer AI-generated results.', expected: 'PASS if search opens and returns relevant clickable results. FAIL if search does nothing.' },
      { num: '0.4', title: 'Notification Bell', how: 'Bell icon with unread count badge. Dropdown lists recent events. Each notification clickable, navigating to relevant item.', ai: 'More notifications from AI background processing.', hybrid: 'Notifications include review-needed items.', human: 'Fewer notifications. Mostly manual confirmations.', expected: 'PASS if bell shows, dropdown lists notifications, clicking navigates. PARTIAL if dropdown empty.' },
      { num: '0.5', title: 'Wallet Display', how: 'Shows AI spending wallet balance ($355.02 in demo). In sidebar below AI mode toggle. Tracks spending across 4 budget pools.', ai: 'Balance displayed. AI runs continuously = higher spending in production.', hybrid: 'Same. Moderate spending.', human: 'Same. Minimal spending.', expected: 'PASS if balance visible in sidebar. FAIL if no wallet display.' },
      { num: '0.6', title: 'AI Mode Toggle', how: 'Toggle in sidebar cycles between: AI Autonomous (crimson), Hybrid (blue), Human Controlled (yellow). Changes immediately affect all pages.', ai: 'Shows "AI Auto" with crimson indicator. No banners. All AI buttons visible.', hybrid: 'Shows "Hybrid" with blue indicator. Yellow banner on pages.', human: 'Shows "Human" with yellow indicator. Blue banner on pages.', expected: 'PASS if switching updates all pages immediately. PARTIAL if toggle works but pages unchanged.' },
      { num: '0.7', title: 'Help Guide [?] buttons', how: 'Each sidebar section has [?] icon on hover. Opens centered modal card slideshow with progress bar, step content, mockup preview, and mode-aware tip that changes based on current AI mode.', ai: 'Guide available. Crimson mode tip explains AI Autonomous behavior.', hybrid: 'Guide available. Blue mode tip explains Hybrid behavior.', human: 'Guide available. Yellow mode tip explains Manual behavior.', expected: 'PASS if guide opens with steps, mockups, and mode-aware tips. FAIL if no guide button.' },
      { num: '0.8', title: 'Logout', how: 'Logout button in sidebar shows confirmation dialog. Confirming destroys session and returns to login.', ai: 'Same in all modes.', hybrid: 'Same.', human: 'Same.', expected: 'PASS if logout returns to login screen. FAIL if logout missing or stays logged in.' },
    ]},
    { section: '1. DASHBOARD', items: [
      { num: '1.1', title: 'KPI Cards display', how: '6 metric cards: Total Leads, Qualified, Active Deals, Won Deals, Revenue, Pending Tasks. Pull from database with icons and animations.', ai: 'Auto-update. "AI Routed" badges on leads.', hybrid: 'Update with "Needs Review" badges.', human: 'Update from manual work only. Status badges.', expected: 'PASS if all 6 cards show with numbers and mode-specific badges.' },
      { num: '1.2', title: 'Quick Action shortcuts', how: '4 buttons: Find Prospects, View Pipeline, Create Content, Open Settings. Navigate to correct pages. Hover animation.', ai: 'All shortcuts visible. "Find Prospects" label.', hybrid: 'Same labels.', human: '"Enter Prospects Manually" replaces "Find Prospects".', expected: 'PASS if all 4 navigate correctly. Human mode should change "Find Prospects" label.' },
      { num: '1.3', title: 'Pipeline Summary', how: 'Pipeline stages with progress bars. Top 3 deals listed. "View All" links to CRM.', ai: '"Auto-Advanced" badges on deals.', hybrid: '"Review Required" badges.', human: 'Stage name badges.', expected: 'PASS if stages, deals, and "View All" work.' },
      { num: '1.4', title: 'Recent Leads + System Status', how: 'Up to 5 recent leads with mode badges. Mode-aware annotations. System status shows 6 module indicators with colored dots.', ai: '"AI Routed" badges. Green pulsing dots. "Full auto" descriptions.', hybrid: '"Needs Review" badges. Green dots. "AI + human review".', human: 'Status badges. Yellow dots. "Manual only".', expected: 'PASS if leads show with correct badges and system status reflects current mode.' },
    ]},
    { section: '2. OUTREACH (6 Agents)', items: [
      { num: '2.1', title: 'Prospect Finder', how: '"Find Prospects" searches cybersecurity companies, scores on Fit and Accessibility (0-100), returns ranked prospect cards with contact details.', ai: 'Button visible. AI runs immediately. Results with action buttons.', hybrid: 'Button visible. Results with "AI Generated" badge. Review before acting.', human: 'Button hidden or replaced with "Create Lead" manual form.', expected: 'PASS if prospect cards show with scores and contact info. Toast confirms results.' },
      { num: '2.2', title: 'Social Command Center', how: 'Unified inbox from LinkedIn, Email, Facebook, X. Messages classified as Hot/Warm/Cold/Spam. AI response drafts. Send and Move to CRM buttons.', ai: 'Auto-classified. Auto-drafted. Hot leads may auto-move to CRM.', hybrid: 'Classified and drafted. You review before sending.', human: 'Messages shown unclassified. Manual triage.', expected: 'PASS if inbox shows messages with platform icons, classification, and action buttons.' },
      { num: '2.3', title: 'Strategy + Compose + Follow-ups', how: 'Strategy: multi-channel sequence plans. Compose: personalized messages per channel (no forbidden words). Follow-ups: tracking with escalation logic.', ai: 'Full auto-generation. Auto-escalation.', hybrid: 'AI drafts. You review and confirm.', human: 'Manual planning. Templates available.', expected: 'PASS if all three tabs show content with actionable buttons producing toasts.' },
      { num: '2.4', title: 'Analytics', how: 'Reply rates, open rates, conversions per channel. Winner/loser identification. "Apply Recommendation" buttons.', ai: 'Auto-update. Recommendations auto-applied.', hybrid: 'You click to apply recommendations.', human: 'View-only analytics.', expected: 'PASS if charts display with meaningful data and recommendation buttons.' },
    ]},
    { section: '3. CRM (5 Agents)', items: [
      { num: '3.1', title: 'Pipeline View', how: 'Kanban board with columns: New Lead, Meeting Set, Discovery, Proposal, Negotiation, Won, Lost. Deal cards with name, value, health indicator.', ai: 'Auto-advance based on activity signals.', hybrid: 'AI recommends stage changes. You confirm.', human: 'Manual stage changes only.', expected: 'PASS if pipeline columns visible with interactive deal cards and total value.' },
      { num: '3.2', title: 'Lead Scoring', how: '5-dimension scoring: Company Fit (30%), Marketing Need (25%), Budget (20%), Timing (15%), Authority (10%). Categories: Hot 80+, Warm 50-79, Cold <50.', ai: 'Auto-scored immediately on entry.', hybrid: 'AI scores, you confirm before routing.', human: 'Manual scoring or request AI assistance.', expected: 'PASS if score breakdown with 5 dimensions and reasoning visible.' },
      { num: '3.3', title: 'Call Intelligence', how: 'Pre-Call Prep, Coaching Cards (objection handling), Transcript Analysis (upload Zoom transcript for sentiment/action items/follow-up draft).', ai: 'Auto-generated briefings. Auto-drafted follow-ups.', hybrid: 'AI prepares. You review follow-ups.', human: 'Request briefings manually.', expected: 'PASS if all three sections work with specific content.' },
      { num: '3.4', title: 'Proposals + CRM Sync', how: 'Proposals: custom scope, timeline, pricing ($2,500/$5,000/$10,000). Status tracking. CRM Sync: GHL + HubSpot connections with sync status.', ai: 'Auto-generate proposals. Continuous sync.', hybrid: 'Generate on request. Scheduled sync.', human: 'Manual creation. Manual sync.', expected: 'PASS if proposals generate with tiers and sync cards show status.' },
    ]},
    { section: '4. MARKETING (5 Agents)', items: [
      { num: '4.1', title: 'Content Strategy', how: 'Content calendar across channels. Create Content generates in PMG brand voice. Status flow: Draft > Review > Approved > Published.', ai: 'Auto-populated calendar. Auto-drafted content.', hybrid: 'AI suggests. You approve before scheduling.', human: 'Manual calendar. AI creation buttons hidden.', expected: 'PASS if calendar shows, creation works, status flow tracks.' },
      { num: '4.2', title: 'Campaigns + SEO', how: 'Campaign builder for Facebook/LinkedIn/Google. Never auto-publishes. SEO audit with keyword research and ranked fixes.', ai: 'AI builds complete packages. SEO audits auto-run.', hybrid: 'AI drafts. You review before launch. Audits on request.', human: 'Build from scratch. AI tools may be hidden.', expected: 'PASS if campaign builder and SEO audit work with toasts.' },
      { num: '4.3', title: 'Orchestrator + Competitor Intel', how: 'Multi-channel campaign coordination with timeline. Competitor scanning with battle cards and gap identification.', ai: 'Auto-coordinate. Weekly competitor scans.', hybrid: 'Suggest plans. Scans on request.', human: 'Manual planning. Static competitor data.', expected: 'PASS if campaign plans and battle cards display with action buttons.' },
    ]},
    { section: '5. PRODUCTION (8+ Agents)', items: [
      { num: '5.1', title: 'Client Onboarding + Audit', how: '7-step sequential checklist with progress bar. Marketing Audit scores website/social/ads/email/SEO (0-100).', ai: 'Some steps auto-complete. Audit auto-triggers.', hybrid: 'Complete steps manually. AI assists. Audit on request.', human: 'All manual. Audit requires AI mode.', expected: 'PASS if steps unlock sequentially and audit shows scores with fix plan.' },
      { num: '5.2', title: 'Creative Production', how: 'Select type (Image/Video/Document/Branding). Describe what you want. AI generates. Preview and download.', ai: 'AI generates immediately.', hybrid: 'Generate and review before approval.', human: 'AI generation disabled. Upload own assets.', expected: 'PASS if type selection, generation, preview, and download all work.' },
      { num: '5.3', title: 'Lead Generator + Campaigns + Quality', how: 'Generate 20 leads/client/month (80+ scored). Campaign funnels. Quality review with badges and approve/fix/regenerate actions.', ai: 'Auto-generate. Auto-publish ready items.', hybrid: 'Generate on request. Manual approval.', human: 'View only. AI features disabled.', expected: 'PASS if lead generation, funnel building, and quality review all function.' },
      { num: '5.4', title: 'Reporting + CRM Sync', how: 'Executive and detailed reports. ROI calculation. PDF export. CRM sync to client GHL/HubSpot.', ai: 'Auto-generate reports. Continuous sync.', hybrid: 'Generate on request. Review before sending.', human: 'View raw data only.', expected: 'PASS if reports generate with ROI and sync works.' },
    ]},
    { section: '6. ADMIN (4 Agents)', items: [
      { num: '6.1', title: 'Operations', how: 'Task cards with assignee, priority, due date. "Mark Complete" and "Auto-Assign" buttons. Overdue highlighting.', ai: 'Tasks auto-assigned. "Auto-Assign" visible.', hybrid: 'AI suggests. You approve.', human: '"Auto-Assign" hidden. Manual assignment.', expected: 'PASS if tasks display and "Mark Complete" works. "Auto-Assign" gated by mode.' },
      { num: '6.2', title: 'Knowledge Base + Briefing + Evolution', how: '24 documents with categories/search. Morning briefing with urgent items and "Go to" buttons. System evolution with Approve/Explore/Skip decisions.', ai: 'Auto-update KB. Auto-generate briefings. Auto-scan for updates.', hybrid: 'Update/generate on request.', human: 'AI buttons hidden. View historical data.', expected: 'PASS if all three tabs function with proper mode gating.' },
    ]},
    { section: '7. FINANCE (2 Agents)', items: [
      { num: '7.1', title: 'Billing & Revenue', how: 'Invoice list with statuses (Paid/Sent/Overdue/Draft). Create, send, track invoices. MRR metric. "Auto-Generate Monthly" for recurring.', ai: 'Recurring auto-generate. Reminders auto-send.', hybrid: 'Create manually. Auto-scheduled reminders.', human: '"Auto-Generate" hidden. All manual.', expected: 'PASS if invoices display, actions work, MRR shown, and AI button gated by mode.' },
      { num: '7.2', title: 'Contracts & Expenses', how: 'Contracts with pricing tiers. 60-day renewal alerts. Expense tracking (4 categories). P&L report. Scenario modeling.', ai: 'Auto-draft contracts. Auto-track expenses.', hybrid: 'You create contracts. Auto expense tracking.', human: '"Draft Contract" hidden. Manual logging.', expected: 'PASS if contracts, expenses, P&L, and scenario modeling all work.' },
    ]},
    { section: '8. SETTINGS (10 Tabs)', items: [
      { num: '8.1', title: 'General + AI Modes', how: 'Company info, branding, brand voice settings. AI Modes: 3 mode cards with per-section overrides (6 sections).', ai: 'Settings apply to all auto-generated content.', hybrid: 'Same. Apply to AI drafts you review.', human: 'Same. Apply when you request AI.', expected: 'PASS if settings save and mode switching works with per-section overrides.' },
      { num: '8.2', title: 'Wallet + Users + Channels', how: 'Wallet: balance, pools, spending controls. Users: roles (Super Admin, Admin, Manager, Viewer). Channels: 6 platforms with anti-spam toggles.', ai: 'All pools active. Highest spending.', hybrid: 'Moderate usage.', human: 'Minimal usage.', expected: 'PASS if wallet breakdown, user management, and channel connections all display.' },
      { num: '8.3', title: 'Integrations + API Keys + Legal + Notifications + Health', how: '6 integrations, 6 API keys, CAN-SPAM/GDPR/TCPA compliance, notification toggles, 32 agent health monitoring.', ai: 'All 32 agents active. Full monitoring.', hybrid: 'On-demand activation.', human: 'Agents on standby.', expected: 'PASS if all remaining tabs render with interactive elements.' },
    ]},
    { section: '9. CROSS-CUTTING TESTS', items: [
      { num: '9.1', title: 'Mode behavior across all pages', how: 'Switch each mode. Visit every page. Verify correct banners, button visibility, and badges.', ai: 'No banners. All AI buttons. AI badges.', hybrid: 'Yellow banner. All buttons. Review badges.', human: 'Blue banner. AI buttons hidden. Manual alternatives.', expected: 'PASS if each mode produces visibly different behavior across every page.' },
      { num: '9.2', title: 'End-to-end flow chains', how: 'Every button produces a toast. No dead ends. No undefined/null in toasts. Complete chains: Outreach>CRM>Production>Finance.', ai: 'Full auto chain.', hybrid: 'Manual confirmation at each step.', human: 'All manual with some buttons hidden.', expected: 'PASS if every button produces a result. No silent failures.' },
      { num: '9.3', title: 'Content standards + Error handling', how: 'No forbidden words. Correct cybersecurity terminology. Consistent pricing. 403 fallback toasts. No console errors. Responsive design.', ai: 'All content checked.', hybrid: 'Same.', human: 'Same.', expected: 'PASS if no forbidden words, correct terminology, no crashes, responsive layout.' },
    ]},
  ];

  for (const section of detailedSections) {
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400 }, shading: { type: ShadingType.SOLID, color: 'DC2626' }, children: [new TextRun({ text: `  ${section.section}`, bold: true, size: 28, color: 'FFFFFF', font: 'Arial' })] }));
    children.push(new Paragraph({ text: '' }));

    for (const item of section.items) {
      children.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: `${item.num} — ${item.title}`, bold: true, size: 24, color: '0F172A', font: 'Arial' })] }));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'HOW IT WORKS:', bold: true, size: 18, color: 'DC2626', font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: item.how, size: 18, color: '374151', font: 'Arial' })]}));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'IN AI AUTONOMOUS MODE:', bold: true, size: 18, color: 'DC2626', font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: item.ai, size: 18, color: '374151', font: 'Arial' })]}));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'IN HYBRID MODE:', bold: true, size: 18, color: 'DC2626', font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: item.hybrid, size: 18, color: '374151', font: 'Arial' })]}));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'IN HUMAN CONTROLLED MODE:', bold: true, size: 18, color: 'DC2626', font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: item.human, size: 18, color: '374151', font: 'Arial' })]}));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'EXPECTED RESULT:', bold: true, size: 18, color: 'DC2626', font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: item.expected, size: 18, color: '374151', font: 'Arial' })]}));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [
        new TextRun({ text: 'YOUR STATUS (circle one):     ', bold: true, size: 18, font: 'Arial' }),
        new TextRun({ text: 'PASS', bold: true, size: 18, color: '16A34A', font: 'Arial' }),
        new TextRun({ text: '     /     ', size: 18, font: 'Arial' }),
        new TextRun({ text: 'PARTIAL', bold: true, size: 18, color: 'D97706', font: 'Arial' }),
        new TextRun({ text: '     /     ', size: 18, font: 'Arial' }),
        new TextRun({ text: 'FAIL', bold: true, size: 18, color: 'DC2626', font: 'Arial' }),
        new TextRun({ text: '     /     ', size: 18, font: 'Arial' }),
        new TextRun({ text: 'N/A', bold: true, size: 18, color: '6B7280', font: 'Arial' }),
      ]}));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: 'YOUR NOTES:', bold: true, size: 18, font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: '___________________________________________________________________________', size: 18, color: 'E5E7EB', font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: '___________________________________________________________________________', size: 18, color: 'E5E7EB', font: 'Arial' })]}));
      children.push(new Paragraph({ children: [new TextRun({ text: '___________________________________________________________________________', size: 18, color: 'E5E7EB', font: 'Arial' })]}));
      children.push(new Paragraph({ text: '' }));
      children.push(new Paragraph({ children: [new TextRun({ text: '────────────────────────────────────────────────────────────────────────', size: 16, color: 'E5E7EB', font: 'Arial' })]}));
    }
  }

  const docx = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(docx);
  fs.writeFileSync('PMG-OS-Checklist-Detailed.docx', buf);
}

async function main() {
  console.log('Generating V2 PDF...');
  await generateV2PDF();
  console.log('Done: PMG-OS-Checklist-V2.pdf');

  console.log('Generating V2 Word...');
  await generateV2Word();
  console.log('Done: PMG-OS-Checklist-V2.docx');

  console.log('Generating Detailed Word...');
  await generateDetailedWord();
  console.log('Done: PMG-OS-Checklist-Detailed.docx');

  console.log('All 3 files generated!');
}

main().catch(console.error);
