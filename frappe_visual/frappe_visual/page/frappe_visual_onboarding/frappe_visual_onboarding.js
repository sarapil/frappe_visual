// Copyright (c) 2024, Moataz M Hassan (Arkan Lab)
// Developer Website: https://arkan.it.com
// License: GPL-3.0
// For license information, please see license.txt

frappe.pages["frappe-visual-onboarding"].on_page_load = async function(wrapper) {
    const page = frappe.ui.make_app_page({ parent: wrapper, title: __("Frappe Visual Onboarding"), single_column: true });
    page.set_secondary_action(__("Skip"), () => frappe.set_route("app"));
    const $c = $(page.body).html('<div id="frappe_visual_onboarding-container"></div>').find("#frappe_visual_onboarding-container");
    const B = "#3B82F6", BL = "#DBEAFE";
    const steps = [
        { title: __("Welcome to Frappe Visual"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="60" r="55" fill="${BL}" stroke="${B}" stroke-width="3"><animate attributeName="r" values="52;55;52" dur="3s" repeatCount="indefinite"/></circle><text x="60" y="68" text-anchor="middle" font-size="36" font-weight="bold">👁️</text></svg><h3 style="color:${B};margin-top:16px">${__("Frappe Visual")}</h3><p style="max-width:500px;margin:12px auto">${__("Visual Graph & UI Component Library — 38+ components")}</p></div>`; } },
        { title: __("GraphEngine"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("GraphEngine")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use GraphEngine in Frappe Visual.")}</p></div>`; } },
        { title: __("LayoutManager"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("LayoutManager")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use LayoutManager in Frappe Visual.")}</p></div>`; } },
        { title: __("FloatingWindow"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("FloatingWindow")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use FloatingWindow in Frappe Visual.")}</p></div>`; } },
        { title: __("AppMap"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("AppMap")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use AppMap in Frappe Visual.")}</p></div>`; } },
        { title: __("RelationshipExplorer"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("RelationshipExplorer")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use RelationshipExplorer in Frappe Visual.")}</p></div>`; } },
        { title: __("Storyboard"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("Storyboard")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use Storyboard in Frappe Visual.")}</p></div>`; } },
        { title: __("KanbanBoard"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("KanbanBoard")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use KanbanBoard in Frappe Visual.")}</p></div>`; } },
        { title: __("VisualDashboard"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:3em">👁️</span><h3 style="color:${B};margin-top:12px">${__("VisualDashboard")}</h3><p style="max-width:500px;margin:12px auto">${__("Learn how to use VisualDashboard in Frappe Visual.")}</p></div>`; } },
        { title: __("You are Ready!"), content: (el) => { el.innerHTML = `<div style="text-align:center;padding:30px"><span style="font-size:4em">🎉</span><h3 style="color:${B};margin-top:16px">${__("Onboarding Complete!")}</h3><p style="max-width:500px;margin:12px auto">${__("You are now ready to use Frappe Visual. Use ❓ for help.")}</p><div style="margin-top:20px"><button class="btn btn-primary btn-lg" onclick="frappe.set_route('app')">${__("Go to Desk")}</button></div></div>`; } },
    ];
    if(frappe.visual&&frappe.visual.Storyboard) frappe.visual.Storyboard.create({container:$c[0],steps,brand_color:B,navigation:"both",showProgress:true});
    else { let h='<div style="max-width:800px;margin:0 auto;padding:20px">'; steps.forEach((s,i)=>{const d=document.createElement("div");if(s.content)s.content(d);h+=`<div style="margin-bottom:24px;padding:20px;border:1px solid var(--border-color);border-radius:12px"><h2 style="color:${B}">${s.title}</h2>${d.innerHTML||""}</div>`}); h+="</div>"; $c.html(h); }
};
