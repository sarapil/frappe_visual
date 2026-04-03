/**
 * Visual Templates Demo Page
 * ==========================
 * Interactive showcase of all frappe_visual page templates
 * with bilingual tooltip demonstration.
 */

frappe.pages["visual-templates-demo"].on_page_load = function (wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: __("Visual Templates Demo"),
        single_column: true,
    });

    // Store page reference
    wrapper.page = page;

    // Add template selector buttons
    const templates = [
        { id: "dashboard", label: __("Dashboard"), icon: "layout-dashboard", labelAr: "لوحة المعلومات" },
        { id: "erd", label: __("ERD"), icon: "hierarchy-2", labelAr: "مخطط العلاقات" },
        { id: "workflow", label: __("Workflow"), icon: "git-branch", labelAr: "سير العمل" },
        { id: "tree", label: __("Tree"), icon: "binary-tree", labelAr: "الشجرة" },
        { id: "wizard", label: __("Wizard"), icon: "wand", labelAr: "المعالج" },
        { id: "kanban", label: __("Kanban"), icon: "layout-kanban", labelAr: "كانبان" },
        { id: "timeline", label: __("Timeline"), icon: "chart-gantt", labelAr: "الجدول الزمني" },
        { id: "appOverview", label: __("App Overview"), icon: "app-window", labelAr: "نظرة عامة" },
    ];

    // Create toolbar with template buttons
    templates.forEach((t) => {
        page.add_button(t.label, () => renderTemplate(t.id), {
            icon: `ti ti-${t.icon}`,
        });
    });

    // Add bilingual toggle
    page.add_button(__("Toggle Bilingual Tips"), () => {
        if (frappe.visual?.bilingualTooltip) {
            const enabled = frappe.visual.bilingualTooltip.toggle();
            frappe.show_alert({
                message: enabled ? __("Bilingual tooltips enabled") : __("Bilingual tooltips disabled"),
                indicator: enabled ? "green" : "orange",
            });
        }
    }, { icon: "ti ti-language" });

    // Main content container
    const $main = $(`
        <div class="fv-demo-container">
            <div class="fv-demo-intro fv-fx-glass fv-fx-page-enter">
                <div class="fv-demo-header">
                    <i class="ti ti-palette fv-demo-icon"></i>
                    <div>
                        <h2>${__("Visual Page Templates")}</h2>
                        <p>${__("Click any button above to preview a template")}</p>
                    </div>
                </div>
                <div class="fv-demo-features">
                    <div class="fv-demo-feature">
                        <i class="ti ti-layout-dashboard"></i>
                        <span>${__("8 Ready-to-use Templates")}</span>
                    </div>
                    <div class="fv-demo-feature">
                        <i class="ti ti-language"></i>
                        <span>${__("Bilingual Tooltip System")}</span>
                    </div>
                    <div class="fv-demo-feature">
                        <i class="ti ti-sparkles"></i>
                        <span>${__("Premium Visual Effects")}</span>
                    </div>
                    <div class="fv-demo-feature">
                        <i class="ti ti-text-direction-rtl"></i>
                        <span>${__("Full RTL Support")}</span>
                    </div>
                </div>
            </div>
            <div class="fv-demo-content"></div>
        </div>
    `).appendTo(page.main);

    // Add demo styles
    addDemoStyles();

    // Render template function
    function renderTemplate(templateId) {
        const $content = $main.find(".fv-demo-content");
        $content.empty();

        // Ensure frappe.visual.templates is loaded
        frappe.require("frappe_visual.bundle.js", () => {
            if (!frappe.visual?.templates) {
                frappe.msgprint(__("Templates module not loaded. Please refresh."));
                return;
            }

            const container = $content[0];

            switch (templateId) {
                case "dashboard":
                    renderDashboardDemo(container);
                    break;
                case "erd":
                    renderERDDemo(container);
                    break;
                case "workflow":
                    renderWorkflowDemo(container);
                    break;
                case "tree":
                    renderTreeDemo(container);
                    break;
                case "wizard":
                    renderWizardDemo(container);
                    break;
                case "kanban":
                    renderKanbanDemo(container);
                    break;
                case "timeline":
                    renderTimelineDemo(container);
                    break;
                case "appOverview":
                    renderAppOverviewDemo(container);
                    break;
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // DASHBOARD DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderDashboardDemo(container) {
        frappe.visual.templates.dashboard(container, {
            title: __("Sales Dashboard"),
            titleAr: "لوحة المبيعات",
            subtitle: __("Real-time business metrics"),
            subtitleAr: "مقاييس الأعمال في الوقت الفعلي",
            kpis: [
                {
                    label: __("Total Revenue"),
                    labelAr: "إجمالي الإيرادات",
                    value: "SAR 1,250,000",
                    icon: "currency-dollar",
                    color: "success",
                    trend: "+12.5%",
                    trendDirection: "up",
                },
                {
                    label: __("New Orders"),
                    labelAr: "الطلبات الجديدة",
                    value: "156",
                    icon: "shopping-cart",
                    color: "primary",
                    trend: "+8.3%",
                    trendDirection: "up",
                },
                {
                    label: __("Active Customers"),
                    labelAr: "العملاء النشطون",
                    value: "2,847",
                    icon: "users",
                    color: "info",
                    trend: "+5.2%",
                    trendDirection: "up",
                },
                {
                    label: __("Pending Invoices"),
                    labelAr: "الفواتير المعلقة",
                    value: "23",
                    icon: "file-invoice",
                    color: "warning",
                    trend: "-3.1%",
                    trendDirection: "down",
                },
            ],
            charts: [
                { title: __("Monthly Sales"), titleAr: "المبيعات الشهرية", type: "line" },
                { title: __("Revenue by Region"), titleAr: "الإيرادات حسب المنطقة", type: "pie" },
            ],
            quickActions: [
                { label: __("New Invoice"), labelAr: "فاتورة جديدة", icon: "file-plus", action: () => frappe.new_doc("Sales Invoice") },
                { label: __("New Order"), labelAr: "طلب جديد", icon: "shopping-cart-plus", action: () => frappe.new_doc("Sales Order") },
                { label: __("Add Customer"), labelAr: "إضافة عميل", icon: "user-plus", action: () => frappe.new_doc("Customer") },
                { label: __("View Reports"), labelAr: "عرض التقارير", icon: "report-analytics", action: () => frappe.set_route("query-report") },
            ],
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // ERD DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderERDDemo(container) {
        frappe.visual.templates.erd(container, {
            title: __("Customer Relationships"),
            titleAr: "علاقات العملاء",
            subtitle: __("Entity relationship diagram for Customer doctype"),
            subtitleAr: "مخطط علاقات الكيانات لنوع مستند العميل",
            doctype: "Customer",
            showFields: true,
            showLinks: true,
            layout: "elk-layered",
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // WORKFLOW DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderWorkflowDemo(container) {
        frappe.visual.templates.workflow(container, {
            title: __("Order Processing Workflow"),
            titleAr: "سير عمل معالجة الطلبات",
            subtitle: __("From order creation to delivery"),
            subtitleAr: "من إنشاء الطلب إلى التسليم",
            stages: [
                {
                    id: "draft",
                    label: __("Draft"),
                    labelAr: "مسودة",
                    icon: "file",
                    color: "#6b7280",
                    description: __("Order created, pending submission"),
                    descriptionAr: "تم إنشاء الطلب، في انتظار الإرسال",
                },
                {
                    id: "submitted",
                    label: __("Submitted"),
                    labelAr: "مُرسَل",
                    icon: "send",
                    color: "#3b82f6",
                    description: __("Order submitted for approval"),
                    descriptionAr: "تم إرسال الطلب للموافقة",
                },
                {
                    id: "approved",
                    label: __("Approved"),
                    labelAr: "موافق عليه",
                    icon: "check",
                    color: "#10b981",
                    description: __("Order approved by manager"),
                    descriptionAr: "تمت الموافقة من المدير",
                },
                {
                    id: "processing",
                    label: __("Processing"),
                    labelAr: "قيد المعالجة",
                    icon: "loader",
                    color: "#f59e0b",
                    description: __("Order being prepared"),
                    descriptionAr: "جاري تحضير الطلب",
                },
                {
                    id: "shipped",
                    label: __("Shipped"),
                    labelAr: "تم الشحن",
                    icon: "truck",
                    color: "#8b5cf6",
                    description: __("Order dispatched"),
                    descriptionAr: "تم إرسال الطلب",
                },
                {
                    id: "delivered",
                    label: __("Delivered"),
                    labelAr: "تم التسليم",
                    icon: "package",
                    color: "#059669",
                    description: __("Order delivered to customer"),
                    descriptionAr: "تم تسليم الطلب للعميل",
                },
            ],
            transitions: [
                { from: "draft", to: "submitted" },
                { from: "submitted", to: "approved" },
                { from: "submitted", to: "draft", label: __("Reject") },
                { from: "approved", to: "processing" },
                { from: "processing", to: "shipped" },
                { from: "shipped", to: "delivered" },
            ],
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // TREE DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderTreeDemo(container) {
        frappe.visual.templates.tree(container, {
            title: __("Organization Structure"),
            titleAr: "الهيكل التنظيمي",
            subtitle: __("Company departments and hierarchy"),
            subtitleAr: "أقسام الشركة والتسلسل الهرمي",
            data: [
                {
                    id: "ceo",
                    label: __("CEO"),
                    labelAr: "الرئيس التنفيذي",
                    icon: "crown",
                    children: [
                        {
                            id: "cto",
                            label: __("CTO"),
                            labelAr: "المدير التقني",
                            icon: "code",
                            children: [
                                { id: "dev-lead", label: __("Dev Lead"), labelAr: "قائد التطوير", icon: "users" },
                                { id: "qa-lead", label: __("QA Lead"), labelAr: "قائد الجودة", icon: "bug" },
                            ],
                        },
                        {
                            id: "cfo",
                            label: __("CFO"),
                            labelAr: "المدير المالي",
                            icon: "report-money",
                            children: [
                                { id: "accounting", label: __("Accounting"), labelAr: "المحاسبة", icon: "calculator" },
                                { id: "treasury", label: __("Treasury"), labelAr: "الخزينة", icon: "cash" },
                            ],
                        },
                        {
                            id: "coo",
                            label: __("COO"),
                            labelAr: "مدير العمليات",
                            icon: "settings",
                            children: [
                                { id: "hr", label: __("HR"), labelAr: "الموارد البشرية", icon: "users-group" },
                                { id: "operations", label: __("Operations"), labelAr: "العمليات", icon: "building" },
                            ],
                        },
                    ],
                },
            ],
            expandAll: true,
            searchable: true,
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // WIZARD DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderWizardDemo(container) {
        frappe.visual.templates.wizard(container, {
            title: __("Setup Wizard"),
            titleAr: "معالج الإعداد",
            subtitle: __("Complete the following steps to get started"),
            subtitleAr: "أكمل الخطوات التالية للبدء",
            steps: [
                {
                    id: "company",
                    title: __("Company Details"),
                    titleAr: "بيانات الشركة",
                    icon: "building",
                    content: `
                        <div class="fv-wizard-step-content">
                            <p>${__("Enter your company information to get started.")}</p>
                            <div class="fv-wizard-fields">
                                <div class="fv-wizard-field">
                                    <label>${__("Company Name")}</label>
                                    <input type="text" placeholder="${__("Enter company name")}">
                                </div>
                                <div class="fv-wizard-field">
                                    <label>${__("Industry")}</label>
                                    <select>
                                        <option>${__("Select industry")}</option>
                                        <option>${__("Technology")}</option>
                                        <option>${__("Manufacturing")}</option>
                                        <option>${__("Retail")}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `,
                },
                {
                    id: "users",
                    title: __("Add Users"),
                    titleAr: "إضافة المستخدمين",
                    icon: "users",
                    content: `
                        <div class="fv-wizard-step-content">
                            <p>${__("Invite team members to your workspace.")}</p>
                            <div class="fv-wizard-fields">
                                <div class="fv-wizard-field">
                                    <label>${__("Email Address")}</label>
                                    <input type="email" placeholder="${__("user@example.com")}">
                                </div>
                                <div class="fv-wizard-field">
                                    <label>${__("Role")}</label>
                                    <select>
                                        <option>${__("Admin")}</option>
                                        <option>${__("Manager")}</option>
                                        <option>${__("User")}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    `,
                },
                {
                    id: "settings",
                    title: __("Settings"),
                    titleAr: "الإعدادات",
                    icon: "settings",
                    content: `
                        <div class="fv-wizard-step-content">
                            <p>${__("Configure your preferences.")}</p>
                            <div class="fv-wizard-options">
                                <label class="fv-wizard-checkbox">
                                    <input type="checkbox" checked>
                                    <span>${__("Enable notifications")}</span>
                                </label>
                                <label class="fv-wizard-checkbox">
                                    <input type="checkbox" checked>
                                    <span>${__("Auto-backup data")}</span>
                                </label>
                                <label class="fv-wizard-checkbox">
                                    <input type="checkbox">
                                    <span>${__("Enable dark mode")}</span>
                                </label>
                            </div>
                        </div>
                    `,
                },
                {
                    id: "complete",
                    title: __("Complete"),
                    titleAr: "اكتمال",
                    icon: "check",
                    content: `
                        <div class="fv-wizard-step-content fv-wizard-complete">
                            <i class="ti ti-circle-check fv-wizard-complete-icon"></i>
                            <h3>${__("Setup Complete!")}</h3>
                            <p>${__("You're all set. Click Finish to start using the system.")}</p>
                        </div>
                    `,
                },
            ],
            onComplete: () => {
                frappe.show_alert({
                    message: __("Wizard completed successfully!"),
                    indicator: "green",
                });
            },
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // KANBAN DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderKanbanDemo(container) {
        frappe.visual.templates.kanbanWorkspace(container, {
            title: __("Project Tasks"),
            titleAr: "مهام المشروع",
            subtitle: __("Drag and drop to organize tasks"),
            subtitleAr: "اسحب وأفلت لتنظيم المهام",
            columns: [
                {
                    id: "backlog",
                    title: __("Backlog"),
                    titleAr: "قائمة الانتظار",
                    color: "#6b7280",
                    cards: [
                        { id: "t1", title: __("Research competitors"), titleAr: "بحث المنافسين", assignee: "أحمد" },
                        { id: "t2", title: __("Write documentation"), titleAr: "كتابة التوثيق", assignee: "سارة" },
                    ],
                },
                {
                    id: "todo",
                    title: __("To Do"),
                    titleAr: "للتنفيذ",
                    color: "#3b82f6",
                    cards: [
                        { id: "t3", title: __("Design mockups"), titleAr: "تصميم النماذج", assignee: "محمد", priority: "high" },
                        { id: "t4", title: __("API integration"), titleAr: "دمج API", assignee: "خالد" },
                    ],
                },
                {
                    id: "progress",
                    title: __("In Progress"),
                    titleAr: "قيد التنفيذ",
                    color: "#f59e0b",
                    wipLimit: 3,
                    cards: [
                        { id: "t5", title: __("Frontend development"), titleAr: "تطوير الواجهة", assignee: "فاطمة", priority: "high" },
                        { id: "t6", title: __("Database optimization"), titleAr: "تحسين قاعدة البيانات", assignee: "علي" },
                    ],
                },
                {
                    id: "review",
                    title: __("Review"),
                    titleAr: "المراجعة",
                    color: "#8b5cf6",
                    cards: [
                        { id: "t7", title: __("Code review"), titleAr: "مراجعة الكود", assignee: "نورا" },
                    ],
                },
                {
                    id: "done",
                    title: __("Done"),
                    titleAr: "مكتمل",
                    color: "#10b981",
                    cards: [
                        { id: "t8", title: __("Project setup"), titleAr: "إعداد المشروع", assignee: "أحمد" },
                        { id: "t9", title: __("Initial planning"), titleAr: "التخطيط الأولي", assignee: "سارة" },
                    ],
                },
            ],
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // TIMELINE DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderTimelineDemo(container) {
        const today = frappe.datetime.get_today();
        const addDays = (d, n) => frappe.datetime.add_days(d, n);

        frappe.visual.templates.timeline(container, {
            title: __("Project Timeline"),
            titleAr: "الجدول الزمني للمشروع",
            subtitle: __("Q2 2026 Development Roadmap"),
            subtitleAr: "خارطة طريق التطوير للربع الثاني 2026",
            tasks: [
                {
                    id: "phase1",
                    name: __("Phase 1: Planning"),
                    nameAr: "المرحلة 1: التخطيط",
                    start: today,
                    end: addDays(today, 14),
                    progress: 100,
                    color: "#10b981",
                },
                {
                    id: "phase2",
                    name: __("Phase 2: Design"),
                    nameAr: "المرحلة 2: التصميم",
                    start: addDays(today, 10),
                    end: addDays(today, 28),
                    progress: 75,
                    color: "#3b82f6",
                    dependencies: ["phase1"],
                },
                {
                    id: "phase3",
                    name: __("Phase 3: Development"),
                    nameAr: "المرحلة 3: التطوير",
                    start: addDays(today, 25),
                    end: addDays(today, 60),
                    progress: 30,
                    color: "#f59e0b",
                    dependencies: ["phase2"],
                },
                {
                    id: "phase4",
                    name: __("Phase 4: Testing"),
                    nameAr: "المرحلة 4: الاختبار",
                    start: addDays(today, 55),
                    end: addDays(today, 75),
                    progress: 0,
                    color: "#8b5cf6",
                    dependencies: ["phase3"],
                },
                {
                    id: "phase5",
                    name: __("Phase 5: Launch"),
                    nameAr: "المرحلة 5: الإطلاق",
                    start: addDays(today, 73),
                    end: addDays(today, 80),
                    progress: 0,
                    color: "#ef4444",
                    dependencies: ["phase4"],
                },
            ],
            viewMode: "Week",
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // APP OVERVIEW DEMO
    // ═══════════════════════════════════════════════════════════════
    function renderAppOverviewDemo(container) {
        frappe.visual.templates.appOverview(container, {
            appName: "Frappe Visual",
            appNameAr: "فراب فيجوال",
            tagline: __("Visual GUI Framework for Frappe"),
            taglineAr: "إطار عمل واجهة مستخدم رسومية لـ Frappe",
            logo: "/assets/frappe_visual/images/frappe_visual-logo.svg",
            color: "#6366f1",
            features: [
                {
                    title: __("15 Visual Components"),
                    titleAr: "15 مكون مرئي",
                    description: __("From graphs to kanban boards, everything you need"),
                    descriptionAr: "من الرسوم البيانية إلى لوحات كانبان، كل ما تحتاجه",
                    icon: "components",
                },
                {
                    title: __("3000+ Icons"),
                    titleAr: "أكثر من 3000 أيقونة",
                    description: __("Tabler Icons with smart DocType mapping"),
                    descriptionAr: "أيقونات Tabler مع ربط ذكي لأنواع المستندات",
                    icon: "icons",
                },
                {
                    title: __("Full RTL Support"),
                    titleAr: "دعم كامل لـ RTL",
                    description: __("Built for Arabic and Hebrew from the ground up"),
                    descriptionAr: "مبني للعربية والعبرية من الأساس",
                    icon: "text-direction-rtl",
                },
                {
                    title: __("Premium Animations"),
                    titleAr: "رسوم متحركة احترافية",
                    description: __("GSAP-powered smooth animations everywhere"),
                    descriptionAr: "رسوم متحركة سلسة بتقنية GSAP في كل مكان",
                    icon: "sparkles",
                },
            ],
            showAppMap: true,
            showERD: false,
            ctaButtons: [
                {
                    label: __("Get Started"),
                    labelAr: "ابدأ الآن",
                    primary: true,
                    action: () => frappe.set_route("app/visual-hub"),
                },
                {
                    label: __("Documentation"),
                    labelAr: "التوثيق",
                    action: () => window.open("/docs/frappe_visual", "_blank"),
                },
            ],
        });
    }

    // Add demo-specific styles
    function addDemoStyles() {
        if (document.getElementById("fv-demo-styles")) return;

        const style = document.createElement("style");
        style.id = "fv-demo-styles";
        style.textContent = `
            .fv-demo-container {
                padding: 24px;
                max-width: 1400px;
                margin: 0 auto;
            }

            .fv-demo-intro {
                padding: 32px;
                border-radius: 20px;
                margin-bottom: 32px;
                background: var(--fv-glass-bg, rgba(255, 255, 255, 0.8));
                backdrop-filter: blur(12px);
            }

            .fv-demo-header {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 24px;
            }

            .fv-demo-icon {
                font-size: 48px;
                color: var(--primary);
                background: var(--primary-light, rgba(99, 102, 241, 0.1));
                padding: 16px;
                border-radius: 16px;
            }

            .fv-demo-header h2 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }

            .fv-demo-header p {
                margin: 4px 0 0;
                color: var(--text-muted);
            }

            .fv-demo-features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
            }

            .fv-demo-feature {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 16px;
                border-radius: 12px;
                background: var(--fg-color);
                border: 1px solid var(--border-color);
            }

            .fv-demo-feature i {
                font-size: 24px;
                color: var(--primary);
            }

            .fv-demo-content {
                min-height: 600px;
            }

            /* Wizard step content styles */
            .fv-wizard-step-content {
                padding: 24px;
            }

            .fv-wizard-fields {
                display: grid;
                gap: 16px;
                margin-top: 16px;
            }

            .fv-wizard-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .fv-wizard-field label {
                font-weight: 500;
                color: var(--text-color);
            }

            .fv-wizard-field input,
            .fv-wizard-field select {
                padding: 10px 14px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                font-size: 14px;
            }

            .fv-wizard-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-top: 16px;
            }

            .fv-wizard-checkbox {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
            }

            .fv-wizard-checkbox input {
                width: 18px;
                height: 18px;
            }

            .fv-wizard-complete {
                text-align: center;
                padding: 48px 24px;
            }

            .fv-wizard-complete-icon {
                font-size: 64px;
                color: var(--green-500, #10b981);
                margin-bottom: 16px;
            }

            .fv-wizard-complete h3 {
                margin: 0 0 8px;
                font-size: 24px;
            }

            /* RTL adjustments */
            [dir="rtl"] .fv-demo-header {
                flex-direction: row-reverse;
            }

            [dir="rtl"] .fv-demo-feature {
                flex-direction: row-reverse;
            }
        `;
        document.head.appendChild(style);
    }
};
