// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

/**
 * Frappe Visual — Main Bundle Entry
 * ==================================
 * This file is the esbuild entry point. It imports all core modules,
 * registers them under the frappe.visual namespace, and initializes
 * the global theming system.
 *
 * Build: bench build --app frappe_visual
 * Lazy-load: await frappe.require("frappe_visual.bundle.js")
 */

// ── Core Libraries ───────────────────────────────────────────────
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import elk from "cytoscape-elk";
import cxtmenu from "cytoscape-cxtmenu";
import expandCollapse from "cytoscape-expand-collapse";
import navigator from "cytoscape-navigator";
import nodeHtmlLabel from "cytoscape-node-html-label";
import ELK from "elkjs/lib/elk.bundled.js";
import { gsap, Draggable } from "gsap/all";
import lottie from "lottie-web";

// ── Register Cytoscape Extensions ────────────────────────────────
cytoscape.use(fcose);
cytoscape.use(elk);
cytoscape.use(cxtmenu);
cytoscape.use(expandCollapse);
cytoscape.use(navigator);
cytoscape.use(nodeHtmlLabel);

// ── Framework Modules ────────────────────────────────────────────
import { GraphEngine } from "./core/graph_engine";
import { LayoutManager } from "./core/layout_manager";
import { AnimationEngine } from "./core/animation_engine";
import { ThemeManager } from "./core/theme_manager";
import { ContextMenu } from "./core/context_menu";
import { Minimap } from "./core/minimap";
import { FloatingWindow } from "./core/floating_window";
import { ColorSystem } from "./utils/color_system";
import { DataAdapter } from "./utils/data_adapter";
import { SVGGenerator } from "./utils/svg_generator";

// ── Components ───────────────────────────────────────────────────
import { AppMap } from "./components/app_map";
import { RelationshipExplorer } from "./components/relationship_explorer";
import { Storyboard } from "./components/storyboard_wizard";
import { VisualDashboard } from "./components/visual_dashboard";
import { ComboGroup } from "./components/combo_group";
import { SummaryBadge } from "./components/summary_badge";
import { KanbanBoard } from "./components/kanban_board";
import { VisualCalendar } from "./components/visual_calendar";
import { VisualGantt } from "./components/visual_gantt";
import { VisualTreeView } from "./components/visual_tree";
import { VisualMap } from "./components/visual_map";
import { VisualGallery } from "./components/visual_gallery";
import { VisualFormDashboard } from "./components/visual_form_dashboard";

// ── Pro Enhancement Components ───────────────────────────────────
import { VisualMapPro } from "./components/visual_map_pro";
import { VisualChartPro } from "./components/visual_chart_pro";
import { AppShell } from "./components/app_shell";
import { VisualFormPro } from "./components/visual_form_pro";
import { VisualListPro } from "./components/visual_list_pro";
import { VisualDashboardPro } from "./components/visual_dashboard_pro";
import { VisualWorkspacePro } from "./components/visual_workspace_pro";

// ── Data Visualization Suite ─────────────────────────────────────
import { VisualTimelinePro } from "./components/visual_timeline_pro";
import { VisualFlowPro } from "./components/visual_flow_pro";
import { VisualOrgChart } from "./components/visual_org_chart";
import { VisualSankey } from "./components/visual_sankey";
import { VisualTreemap } from "./components/visual_treemap";
import { VisualHeatmapCalendar } from "./components/visual_heatmap_calendar";
import { VisualFunnel } from "./components/visual_funnel";
import { VisualRadar } from "./components/visual_radar";
import { VisualReportPro } from "./components/visual_report_pro";

// ── UX Power Suite ───────────────────────────────────────────────
import { CommandPalette } from "./components/command_palette";
import { WorkflowBuilder } from "./components/workflow_builder";
import { SparklineEngine } from "./components/sparkline_engine";
import { NotificationCenter } from "./components/notification_center";
import { PivotTable } from "./components/pivot_table";
import { DataStorytelling } from "./components/data_storytelling";
import { VisualDiff } from "./components/visual_diff";
import { WizardPro } from "./components/wizard_pro";
import { AIChatWidget } from "./components/ai_chat_widget";

// ── Collaboration & Productivity Suite ───────────────────────────
import { VirtualTable } from "./components/virtual_table";
import { VirtualScroller } from "./components/virtual_scroller";
import { VisualTable } from "./components/visual_table";
import { RichEditor } from "./components/rich_editor";
import { RichText } from "./components/rich_text_pro";
import { FileManager } from "./components/file_manager";
import { DataGrid } from "./components/data_grid";
import { Whiteboard } from "./components/whiteboard";
import { TourGuide } from "./components/tour_guide";
import { FilterBuilder } from "./components/filter_builder";
import { ActivityFeed } from "./components/activity_feed";
import { PageHeader } from "./components/page_header";

// ── Media & Content Suite ────────────────────────────────────────
import { CalendarScheduler } from "./components/calendar_scheduler";
import { CodeEditor } from "./components/code_editor";
import { ColorPicker } from "./components/color_picker";
import { ImageAnnotator } from "./components/image_annotator";
import { MediaPlayer } from "./components/media_player";
import { PDFViewer } from "./components/pdf_viewer";

// ── Spatial & Form Tools ─────────────────────────────────────────
import { FloorPlanDesigner } from "./components/floor_plan_designer";
import { FormWizard } from "./components/form_wizard";
import { DataExporter } from "./components/data_exporter";

// ── Enterprise Suite (Wave 5) ────────────────────────────────────
import { CRMPipeline } from "./components/crm_pipeline";
import { InventoryGrid } from "./components/inventory_grid";
import { FormBuilder } from "./components/form_builder";
import { PermissionMatrix } from "./components/permission_matrix";
import { APIExplorer } from "./components/api_explorer";
import { SchemaDesigner } from "./components/schema_designer";
import { ImportWizard } from "./components/import_wizard";
import { AuditTrail } from "./components/audit_trail";
import { StatusBoard } from "./components/status_board";

// ── Analytics & Metrics Suite (Wave 6) ───────────────────────────
import { MetricCard } from "./components/metric_card";
import { ScoreCard } from "./components/score_card";
import { GaugeChart } from "./components/gauge_chart";
import { BulletChart } from "./components/bullet_chart";
import { WaterfallChart } from "./components/waterfall_chart";
import { WordCloud } from "./components/word_cloud";
import { Sunburst } from "./components/sunburst";
import { NetworkGraph } from "./components/network_graph";
import { ProgressTracker } from "./components/progress_tracker";

// ── Form & Input Components Suite (Wave 7) ───────────────────────
import { TagInput } from "./components/tag_input";
import { DateRangePicker } from "./components/date_range_picker";
import { RatingWidget } from "./components/rating_widget";
import { ToggleGroup } from "./components/toggle_group";
import { SliderRange } from "./components/slider_range";
import { SearchSelect } from "./components/search_select";
import { OTPInput } from "./components/otp_input";
import { SignaturePad } from "./components/signature_pad";
import { CronBuilder } from "./components/cron_builder";

// ── Navigation & Layout Suite (Wave 8) ────────────────────────
import { Breadcrumb } from "./components/breadcrumb";
import { Stepper } from "./components/stepper";
import { TabNav } from "./components/tab_nav";
import { Accordion } from "./components/accordion";
import { SplitPane } from "./components/split_pane";
import { CardStack } from "./components/card_stack";
import { MasonryGrid } from "./components/masonry_grid";
import { Pagination } from "./components/pagination";
import { EmptyState } from "./components/empty_state";
import { Skeleton } from "./components/skeleton";

// ── Communication & Feedback Suite (Wave 9) ───────────────────
import { Toast } from "./components/toast";
import { AlertBanner } from "./components/alert_banner";
import { ConfirmDialog } from "./components/confirm_dialog";
import { Popover } from "./components/popover";
import { Drawer } from "./components/drawer";
import { ChatBubble } from "./components/chat_bubble";
import { Spotlight } from "./components/spotlight";

// ── Wave 10 — Data Display & Table Suite ─────────────────────────
import { DataTable } from "./components/data_table";
import { Avatar } from "./components/avatar";
import { Badge } from "./components/badge";
import { Timeline } from "./components/timeline";
import { StatCard } from "./components/stat_card";
import { FileTree } from "./components/file_tree";
import { DescriptionList } from "./components/description_list";
import { ImageGrid } from "./components/image_grid";
import { InlineEdit } from "./components/inline_edit";

// ── Wave 11 — Utility & Advanced Interaction Suite ───────────────
import { Clipboard } from "./components/clipboard";
import { Countdown } from "./components/countdown";
import { SortableList } from "./components/sortable_list";
import { CodeBlock } from "./components/code_block";
import { DiffViewer } from "./components/diff_viewer";
import { Marquee } from "./components/marquee";
import { Divider } from "./components/divider";
import { ScrollSpy } from "./components/scroll_spy";
import { PasswordStrength } from "./components/password_strength";

// ── Wave 12 — Selection & Rich Input Suite ───────────────────────
import { SegmentedControl } from "./components/segmented_control";
import { TransferList } from "./components/transfer_list";
import { PinInput } from "./components/pin_input";
import { CreditCard } from "./components/credit_card";
import { AnnotationLayer } from "./components/annotation_layer";
import { Combobox } from "./components/combobox";
import { NumberStepper } from "./components/number_stepper";
import { ChipInput } from "./components/chip_input";
import { CurrencyInput } from "./components/currency_input";

// ── Wave 13: Content & Layout Composition Suite ──────────────────
import { Carousel } from "./components/carousel";
import { Collapsible } from "./components/collapsible";
import { Highlight } from "./components/highlight";
import { ScrollArea } from "./components/scroll_area";
import { AspectRatio } from "./components/aspect_ratio";
import { Blockquote } from "./components/blockquote";
import { Kbd } from "./components/kbd";
import { StickyHeader } from "./components/sticky_header";
import { ContentPlaceholder } from "./components/content_placeholder";

// ── Wave 14: Status & Feedback Display Suite ────────────────────
import { ProgressRing } from "./components/progress_ring";
import { StatusDot } from "./components/status_dot";
import { CountUp } from "./components/count_up";
import { Callout } from "./components/callout";
import { Banner } from "./components/banner";
import { StepIndicator } from "./components/step_indicator";
import { Comparison } from "./components/comparison";
import { PricingTable } from "./components/pricing_table";
import { FeatureList } from "./components/feature_list";

// Wave 15 — Advanced Interaction & Micro-Animation Suite
import { Typewriter } from "./components/typewriter";
import { ParallaxScroll } from "./components/parallax_scroll";
import { Confetti } from "./components/confetti";
import { Ripple } from "./components/ripple";
import { TextLoop } from "./components/text_loop";
import { NumberTicker } from "./components/number_ticker";
import { GlowCard } from "./components/glow_card";
import { MorphingText } from "./components/morphing_text";
import { DotPattern } from "./components/dot_pattern";

// Wave 16 — Data Visualization & Chart Enhancement Suite
import { Heatmap } from "./components/heatmap";
import { Sparkline } from "./components/sparkline";
import { RadarChart } from "./components/radar_chart";
import { FunnelChart } from "./components/funnel_chart";
import { TreemapChart } from "./components/treemap_chart";
import { DonutChart } from "./components/donut_chart";
import { DataCard } from "./components/data_card";
import { AreaChart } from "./components/area_chart";
import { SankeyChart } from "./components/sankey_chart";

// ── Wave 17 — Layout & Container Components ─────────────────────
import { Masonry } from "./components/masonry";
import { Dock } from "./components/dock";
import { GridStack } from "./components/grid_stack";
import { Bento } from "./components/bento";
import { InfiniteScroll } from "./components/infinite_scroll";
import { Sortable } from "./components/sortable";
import { VirtualList } from "./components/virtual_list";
import { StackedLayout } from "./components/stacked_layout";
import { Resizable } from "./components/resizable";

// ── Wave 18 — Navigation & Wayfinding ────────────────────────────
import { CommandBar } from "./components/command_bar";
import { FloatingNav } from "./components/floating_nav";
import { PageTransition } from "./components/page_transition";
import { BackToTop } from "./components/back_to_top";
import { NavRail } from "./components/nav_rail";
import { AnchorNav } from "./components/anchor_nav";
import { TabBar } from "./components/tab_bar";
import { BottomNav } from "./components/bottom_nav";
import { SpeedDial } from "./components/speed_dial";

// ── Wave 19 — Feedback & Overlay ─────────────────────────────
import { BottomSheet } from "./components/bottom_sheet";
import { Lightbox } from "./components/lightbox";
import { ImageCompare } from "./components/image_compare";
import { Popconfirm } from "./components/popconfirm";
import { CookieBanner } from "./components/cookie_banner";
import { OnboardingTour } from "./components/onboarding_tour";
import { ContextPanel } from "./components/context_panel";
import { PinchZoom } from "./components/pinch_zoom";
import { NotificationStack } from "./components/notification_stack";

// ── Utility Modules (auto-init) ──────────────────────────────────
import "./utils/bilingual_tooltip";
import "./utils/visual_page_templates";
import "./utils/app_page_generator";
import "./utils/doctype_visualizer";
import "./utils/form_enhancer";
import "./utils/list_enhancer";
import "./utils/workspace_enhancer";

// ── Register on frappe.visual namespace ──────────────────────────
frappe.provide("frappe.visual");

// Core
frappe.visual.GraphEngine = GraphEngine;
frappe.visual.LayoutManager = LayoutManager;
frappe.visual.AnimationEngine = AnimationEngine;
frappe.visual.ThemeManager = ThemeManager;
frappe.visual.ContextMenu = ContextMenu;
frappe.visual.Minimap = Minimap;
frappe.visual.FloatingWindow = FloatingWindow;

// Utils
frappe.visual.ColorSystem = ColorSystem;
frappe.visual.DataAdapter = DataAdapter;
frappe.visual.SVGGenerator = SVGGenerator;

// Components
frappe.visual.AppMap = AppMap;
frappe.visual.RelationshipExplorer = RelationshipExplorer;
frappe.visual.Storyboard = Storyboard;
frappe.visual.VisualDashboard = VisualDashboard;
frappe.visual.ComboGroup = ComboGroup;
frappe.visual.SummaryBadge = SummaryBadge;
frappe.visual.KanbanBoard = KanbanBoard;
frappe.visual.VisualCalendar = VisualCalendar;
frappe.visual.VisualGantt = VisualGantt;
frappe.visual.VisualTreeView = VisualTreeView;
frappe.visual.VisualMap = VisualMap;
frappe.visual.VisualGallery = VisualGallery;
frappe.visual.VisualFormDashboard = VisualFormDashboard;

// Pro Enhancements
frappe.visual.MapPro = VisualMapPro;
frappe.visual.ChartPro = VisualChartPro;
frappe.visual.AppShell = AppShell;
frappe.visual.FormPro = VisualFormPro;
frappe.visual.ListPro = VisualListPro;
frappe.visual.DashboardPro = VisualDashboardPro;
frappe.visual.WorkspacePro = VisualWorkspacePro;

// Data Viz Suite
frappe.visual.TimelinePro = VisualTimelinePro;
frappe.visual.FlowPro = VisualFlowPro;
frappe.visual.OrgChart = VisualOrgChart;
frappe.visual.Sankey = VisualSankey;
frappe.visual.Treemap = VisualTreemap;
frappe.visual.HeatmapCalendar = VisualHeatmapCalendar;
frappe.visual.Funnel = VisualFunnel;
frappe.visual.Radar = VisualRadar;
frappe.visual.ReportPro = VisualReportPro;

// UX Power Suite
frappe.visual.CommandPalette = CommandPalette;
frappe.visual.WorkflowBuilder = WorkflowBuilder;
frappe.visual.SparklineEngine = SparklineEngine;
frappe.visual.NotificationCenter = NotificationCenter;
frappe.visual.PivotTable = PivotTable;
frappe.visual.DataStorytelling = DataStorytelling;
frappe.visual.VisualDiff = VisualDiff;
frappe.visual.WizardPro = WizardPro;
frappe.visual.AIChatWidget = AIChatWidget;

// Collaboration & Productivity Suite
frappe.visual.VirtualTable = VirtualTable;
frappe.visual.VirtualScroller = VirtualScroller;
frappe.visual.VisualTable = VisualTable;
frappe.visual.RichEditor = RichEditor;
frappe.visual.RichText = RichText;
frappe.visual.FileManager = FileManager;
frappe.visual.DataGrid = DataGrid;
frappe.visual.Whiteboard = Whiteboard;
frappe.visual.TourGuide = TourGuide;
frappe.visual.FilterBuilder = FilterBuilder;
frappe.visual.ActivityFeed = ActivityFeed;
frappe.visual.PageHeader = PageHeader;

// Media & Content Suite
frappe.visual.CalendarScheduler = CalendarScheduler;
frappe.visual.CodeEditor = CodeEditor;
frappe.visual.ColorPicker = ColorPicker;
frappe.visual.ImageAnnotator = ImageAnnotator;
frappe.visual.MediaPlayer = MediaPlayer;
frappe.visual.PDFViewer = PDFViewer;

// Spatial & Form Tools
frappe.visual.FloorPlanDesigner = FloorPlanDesigner;
frappe.visual.FormWizard = FormWizard;
frappe.visual.DataExporter = DataExporter;

// Enterprise Suite (Wave 5)
frappe.visual.CRMPipeline = CRMPipeline;
frappe.visual.InventoryGrid = InventoryGrid;
frappe.visual.FormBuilder = FormBuilder;
frappe.visual.PermissionMatrix = PermissionMatrix;
frappe.visual.APIExplorer = APIExplorer;
frappe.visual.SchemaDesigner = SchemaDesigner;
frappe.visual.ImportWizard = ImportWizard;
frappe.visual.AuditTrail = AuditTrail;
frappe.visual.StatusBoard = StatusBoard;

// Analytics & Metrics Suite (Wave 6)
frappe.visual.MetricCard = MetricCard;
frappe.visual.ScoreCard = ScoreCard;
frappe.visual.GaugeChart = GaugeChart;
frappe.visual.BulletChart = BulletChart;
frappe.visual.WaterfallChart = WaterfallChart;
frappe.visual.WordCloud = WordCloud;
frappe.visual.Sunburst = Sunburst;
frappe.visual.NetworkGraph = NetworkGraph;
frappe.visual.ProgressTracker = ProgressTracker;

// Form & Input Components Suite (Wave 7)
frappe.visual.TagInput = TagInput;
frappe.visual.DateRangePicker = DateRangePicker;
frappe.visual.RatingWidget = RatingWidget;
frappe.visual.ToggleGroup = ToggleGroup;
frappe.visual.SliderRange = SliderRange;
frappe.visual.SearchSelect = SearchSelect;
frappe.visual.OTPInput = OTPInput;
frappe.visual.SignaturePad = SignaturePad;
frappe.visual.CronBuilder = CronBuilder;

// Navigation & Layout Suite (Wave 8)
frappe.visual.Breadcrumb = Breadcrumb;
frappe.visual.Stepper = Stepper;
frappe.visual.TabNav = TabNav;
frappe.visual.Accordion = Accordion;
frappe.visual.SplitPane = SplitPane;
frappe.visual.CardStack = CardStack;
frappe.visual.MasonryGrid = MasonryGrid;
frappe.visual.Pagination = Pagination;
frappe.visual.EmptyState = EmptyState;
frappe.visual.Skeleton = Skeleton;

// Communication & Feedback Suite (Wave 9)
frappe.visual.Toast = Toast;
frappe.visual.AlertBanner = AlertBanner;
frappe.visual.ConfirmDialog = ConfirmDialog;
frappe.visual.Popover = Popover;
frappe.visual.Drawer = Drawer;
frappe.visual.ChatBubble = ChatBubble;
frappe.visual.Spotlight = Spotlight;

// Wave 10 — Data Display & Table Suite
frappe.visual.DataTable = DataTable;
frappe.visual.Avatar = Avatar;
frappe.visual.Badge = Badge;
frappe.visual.Timeline = Timeline;
frappe.visual.StatCard = StatCard;
frappe.visual.FileTree = FileTree;
frappe.visual.DescriptionList = DescriptionList;
frappe.visual.ImageGrid = ImageGrid;
frappe.visual.InlineEdit = InlineEdit;

// Wave 11 — Utility & Advanced Interaction Suite
frappe.visual.Clipboard = Clipboard;
frappe.visual.Countdown = Countdown;
frappe.visual.SortableList = SortableList;
frappe.visual.CodeBlock = CodeBlock;
frappe.visual.DiffViewer = DiffViewer;
frappe.visual.Marquee = Marquee;
frappe.visual.Divider = Divider;
frappe.visual.ScrollSpy = ScrollSpy;
frappe.visual.PasswordStrength = PasswordStrength;

// Wave 12 — Selection & Rich Input Suite
frappe.visual.SegmentedControl = SegmentedControl;
frappe.visual.TransferList = TransferList;
frappe.visual.PinInput = PinInput;
frappe.visual.CreditCard = CreditCard;
frappe.visual.AnnotationLayer = AnnotationLayer;
frappe.visual.Combobox = Combobox;
frappe.visual.NumberStepper = NumberStepper;
frappe.visual.ChipInput = ChipInput;
frappe.visual.CurrencyInput = CurrencyInput;

// Wave 13: Content & Layout Composition
frappe.visual.Carousel = Carousel;
frappe.visual.Collapsible = Collapsible;
frappe.visual.Highlight = Highlight;
frappe.visual.ScrollArea = ScrollArea;
frappe.visual.AspectRatio = AspectRatio;
frappe.visual.Blockquote = Blockquote;
frappe.visual.Kbd = Kbd;
frappe.visual.StickyHeader = StickyHeader;
frappe.visual.ContentPlaceholder = ContentPlaceholder;

// Wave 14: Status & Feedback Display
frappe.visual.ProgressRing = ProgressRing;
frappe.visual.StatusDot = StatusDot;
frappe.visual.CountUp = CountUp;
frappe.visual.Callout = Callout;
frappe.visual.Banner = Banner;
frappe.visual.StepIndicator = StepIndicator;
frappe.visual.Comparison = Comparison;
frappe.visual.PricingTable = PricingTable;
frappe.visual.FeatureList = FeatureList;

// Wave 15 — Advanced Interaction & Micro-Animation
frappe.visual.Typewriter = Typewriter;
frappe.visual.ParallaxScroll = ParallaxScroll;
frappe.visual.Confetti = Confetti;
frappe.visual.Ripple = Ripple;
frappe.visual.TextLoop = TextLoop;
frappe.visual.NumberTicker = NumberTicker;
frappe.visual.GlowCard = GlowCard;
frappe.visual.MorphingText = MorphingText;
frappe.visual.DotPattern = DotPattern;

// Wave 16 — Data Visualization & Chart Enhancement
frappe.visual.Heatmap = Heatmap;
frappe.visual.Sparkline = Sparkline;
frappe.visual.RadarChart = RadarChart;
frappe.visual.FunnelChart = FunnelChart;
frappe.visual.TreemapChart = TreemapChart;
frappe.visual.DonutChart = DonutChart;
frappe.visual.DataCard = DataCard;
frappe.visual.AreaChart = AreaChart;
frappe.visual.SankeyChart = SankeyChart;

// Wave 17 — Layout & Container
frappe.visual.Masonry = Masonry;
frappe.visual.Dock = Dock;
frappe.visual.GridStack = GridStack;
frappe.visual.Bento = Bento;
frappe.visual.InfiniteScroll = InfiniteScroll;
frappe.visual.Sortable = Sortable;
frappe.visual.VirtualList = VirtualList;
frappe.visual.StackedLayout = StackedLayout;
frappe.visual.Resizable = Resizable;

// Wave 18 — Navigation & Wayfinding
frappe.visual.CommandBar = CommandBar;
frappe.visual.FloatingNav = FloatingNav;
frappe.visual.PageTransition = PageTransition;
frappe.visual.BackToTop = BackToTop;
frappe.visual.NavRail = NavRail;
frappe.visual.AnchorNav = AnchorNav;
frappe.visual.TabBar = TabBar;
frappe.visual.BottomNav = BottomNav;
frappe.visual.SpeedDial = SpeedDial;

// Wave 19 — Feedback & Overlay
frappe.visual.BottomSheet = BottomSheet;
frappe.visual.Lightbox = Lightbox;
frappe.visual.ImageCompare = ImageCompare;
frappe.visual.Popconfirm = Popconfirm;
frappe.visual.CookieBanner = CookieBanner;
frappe.visual.OnboardingTour = OnboardingTour;
frappe.visual.ContextPanel = ContextPanel;
frappe.visual.PinchZoom = PinchZoom;
frappe.visual.NotificationStack = NotificationStack;

// Expose libraries for advanced usage
frappe.visual.cytoscape = cytoscape;
frappe.visual.ELK = ELK;
frappe.visual.gsap = gsap;
frappe.visual.Draggable = Draggable;
frappe.visual.lottie = lottie;

// ── Initialize Theme ─────────────────────────────────────────────
ThemeManager.init();

console.log(
	"%c⬡ Frappe Visual Engine%c ready — 199+ components · Cytoscape · ELK · ECharts · GSAP · Leaflet",
	"color:#6366f1;font-weight:bold",
	"color:#94a3b8"
);
console.log(
	"%c⬡ Wave 15%c Typewriter · Parallax · Confetti · Ripple · TextLoop · NumberTicker · GlowCard · MorphingText · DotPattern",
	"color:#ec4899;font-weight:bold",
	"color:#94a3b8"
);
console.log(
	"%c⬡ Wave 16%c Heatmap · Sparkline · Radar · Funnel · Treemap · Donut · DataCard · Area · Sankey",
	"color:#14b8a6;font-weight:bold",
	"color:#94a3b8"
);
