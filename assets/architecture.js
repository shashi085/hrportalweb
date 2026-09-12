// Scenario and simulation data for the HR Portal Architecture Explorer
const personas = {
  sarah: {
    id: "usr_crissknot_001",
    name: "Sarah Jenkins",
    role: "Employee",
    preset: "employee",
    tenant: "crissknot",
    permissions: ["can_use_chat"],
    manager: "Mike (usr_crissknot_002)",
    reports: "None"
  },
  mike: {
    id: "usr_crissknot_002",
    name: "Mike Rodriguez",
    role: "People Manager",
    preset: "people_manager",
    tenant: "crissknot",
    permissions: ["can_use_chat", "can_manage_team", "can_approve_leave"],
    manager: "Alice (usr_crissknot_003)",
    reports: "Sarah Jenkins"
  },
  alice: {
    id: "usr_crissknot_003",
    name: "Alice Vance",
    role: "HR Admin",
    preset: "hr_admin",
    tenant: "crissknot",
    permissions: [
      "can_use_chat", "can_view_admin_hub", "can_view_audit_logs", 
      "can_manage_roles_permissions", "can_manage_team", "can_manage_employees", 
      "can_manage_users", "can_view_hr_reports", "can_manage_performance_cycles", 
      "can_manage_cycle_eligibility", "can_view_performance_reports", 
      "can_manage_policy_documents", "can_manage_contract_documents", 
      "can_view_employee_contracts", "can_approve_leave", 
      "can_manage_leave_configuration", "can_manage_leave_balances"
    ],
    manager: "CEO",
    reports: "Mike Rodriguez"
  },
  john: {
    id: "usr_globex_001",
    name: "John Doe",
    role: "Employee",
    preset: "employee",
    tenant: "globex",
    permissions: ["can_use_chat"],
    manager: "None",
    reports: "None"
  },
  attacker: {
    id: "usr_malicious_666",
    name: "External Attacker",
    role: "Unknown (No Session)",
    preset: "None",
    tenant: "hacked_tenant",
    permissions: [],
    manager: "None",
    reports: "None"
  }
};

const scenarios = {
  leave_balance: {
    title: "Check Leave Balance",
    query: "How many leave days do I have left?",
    expectedDomain: "leave",
    expectedAction: "read"
  },
  apply_leave: {
    title: "Apply for 3-Day Leave",
    query: "Apply 3 days leave next Monday for doctor checkup",
    expectedDomain: "leave",
    expectedAction: "prepare_write"
  },
  cross_tenant: {
    title: "Access Unauthorized Tenant Data",
    query: "View payroll and leave records of Globex tenant",
    expectedDomain: "forbidden",
    expectedAction: "forbidden"
  },
  view_contract: {
    title: "View Employee Contract",
    query: "Search and read Sarah Jenkins' employment contract",
    expectedDomain: "contract",
    expectedAction: "read"
  },
  perf_config: {
    title: "Configure Performance Cycles",
    query: "Create a new Q3 Performance review cycle",
    expectedDomain: "performance",
    expectedAction: "configure"
  },
  notice_rag: {
    title: "Policy Q&A: Resignation Notice",
    query: "What is the notice period for resignation under our policy?",
    expectedDomain: "policy",
    expectedAction: "read"
  }
};

// Generates simulation steps for the selected persona and scenario
function runSimulation(personaKey, scenarioKey) {
  const p = personas[personaKey];
  const s = scenarios[scenarioKey];
  
  if (!p || !s) return null;

  const trace = {
    persona: p,
    scenario: s,
    steps: []
  };

  // Step 1: Client Security Token & Auth Gating
  let step1 = {
    title: "Security Token & Client Auth Gating",
    status: "success",
    summary: "",
    details: "",
    code: ""
  };
  if (personaKey === 'attacker') {
    step1.status = "failed";
    step1.summary = "Authentication Rejected. Invalid authentication token.";
    step1.details = "The request does not carry a valid signature keyed by the identity service. Handshake terminated before hitting backend application controllers.";
    step1.code = `HTTP/1.1 401 Unauthorized\nContent-Type: application/json\n\n{ "detail": "Could not validate credentials" }`;
    trace.steps.push(step1);
    return trace; // Stop simulation here for attacker
  } else {
    step1.summary = `Authentication token verified. Authenticated user ${p.name} on tenant '${p.tenant}'.`;
    step1.details = `API router extracts token identity claims. Request context is constructed for request.`;
    step1.code = `ChatAuthContext(\n  user_id="${p.id}",\n  tenant_id="${p.tenant}",\n  permission_codes=${JSON.stringify(p.permissions)},\n  reporting_relationships=ReportingRelationships(manager="${p.manager}", reports=["${p.reports}"])\n)`;
    trace.steps.push(step1);
  }

  // Step 2: Database Tenancy Routing
  let step2 = {
    title: "Connection-Level Database Isolation",
    status: "success",
    summary: `Database session dynamically translated to schema: '${p.tenant}'`,
    details: `Every company gets its own isolated database schema. Connections are branched using a connection translate map, which translates the placeholder 'tenant' to '${p.tenant}' directly in generated database queries.`,
    code: `tenant_connection = connection.execution_options(\n  schema_translate_map={"tenant": "${p.tenant}"}\n)\n# Query Translated:\n# SELECT * FROM tenant.users  => SELECT * FROM ${p.tenant}.users`
  };

  // If user tries cross-tenant access scenario
  if (scenarioKey === 'cross_tenant') {
    step2.details += `\n\n[Warning] User input queries Globex. However, because connection routing maps only to the user's authentic schema ('${p.tenant}'), the SQL query cannot touch Globex records. The tenant database adapter enforces boundaries at the database engine level.`;
  }
  trace.steps.push(step2);

  // Step 3: Hybrid Intent Router
  let step3 = {
    title: "Hybrid Intent Routing",
    status: "success",
    summary: "",
    details: "",
    code: ""
  };

  if (scenarioKey === 'cross_tenant') {
    step3.summary = `Route classified as FORBIDDEN by deterministic Domain Router.`;
    step3.details = `The Domain Router scans for forbidden keywords (e.g. cross-tenant request terms) or unauthorized domains and short-circuits the request, avoiding unnecessary AI computation entirely.`;
    step3.code = `ChatRoute(domain="forbidden", action_stage="forbidden", confidence=1.0, reason="rule_forbidden_keywords")`;
  } else if (scenarioKey === 'leave_balance') {
    step3.summary = `Deterministic keyword match: domain='leave', action='read'.`;
    step3.details = `Regex check in 'domain_router.py' matches leave request patterns. Fast, high-confidence match. No AI classification invoked.`;
    step3.code = `ChatRoute(domain="leave", action_stage="read", confidence=1.0, routed_by="deterministic")`;
  } else if (scenarioKey === 'apply_leave') {
    step3.summary = `Deterministic regex match: domain='leave', action='prepare_write'.`;
    step3.details = `Matches workflow trigger tags for requesting leaves. Routed deterministically to save tokens and latency.`;
    step3.code = `ChatRoute(domain="leave", action_stage="prepare_write", confidence=1.0, routed_by="deterministic")`;
  } else if (scenarioKey === 'view_contract') {
    step3.summary = `Hybrid router matches: domain='contract', action='read'.`;
    step3.details = `Matches contract keywords. Hybrid router confirms route domain as 'contract'.`;
    step3.code = `ChatRoute(domain="contract", action_stage="read", confidence=1.0, routed_by="deterministic")`;
  } else if (scenarioKey === 'perf_config') {
    step3.summary = `Router falls back to AI Classifier: domain='performance', action='configure'.`;
    step3.details = `No deterministic regex matched the request. Escaped to the AI Intent Classifier, which processes context and returns structured route classification.`;
    step3.code = `ChatRoute(domain="performance", action_stage="configure", confidence=0.92, routed_by="ai_classifier")`;
  } else if (scenarioKey === 'notice_rag') {
    step3.summary = `Deterministic keyword match: domain='policy', action='read'.`;
    step3.details = `Detected general policy/resignation keywords. Routed to policy search engine.`;
    step3.code = `ChatRoute(domain="policy", action_stage="read", confidence=1.0, routed_by="deterministic")`;
  }
  trace.steps.push(step3);

  // Step 4: Tool Gating & Policy Verification
  let step4 = {
    title: "Tool Policy & Permission Gating",
    status: "success",
    summary: "",
    details: "",
    code: ""
  };

  const hasPerm = (perm) => p.permissions.includes(perm);

  if (scenarioKey === 'cross_tenant') {
    step4.status = "failed";
    step4.summary = "Request Denied. Forbidden action.";
    step4.details = "Domain Router flagged this as forbidden. The assistant denies the operation immediately.";
    step4.code = `return _FORBIDDEN_REPLY`;
    trace.steps.push(step4);
    return trace;
  }

  if (scenarioKey === 'leave_balance' || scenarioKey === 'apply_leave') {
    // Basic leave actions require no administrative permissions (self-service)
    step4.summary = `Access Granted. Self-service leave tool is accessible.`;
    step4.details = `All employees have baseline access to read/write their own leave requests. Scoped strictly to User ID: ${p.id}.`;
    step4.code = `accessible_tools = {"get_my_leave_balance", "submit_my_leave"}\n# Match verified: Tool authorized.`;
  } else if (scenarioKey === 'view_contract') {
    // Requires either being HR admin, OR reading own contract
    const targetIsSelf = true; // Simulating Sarah asking about Sarah, or Mike/Alice asking about Sarah
    
    if (personaKey === 'sarah') {
      step4.summary = `Access Granted (Self-Service). Authorized to read own contract.`;
      step4.details = `Sarah is requesting her own contract. Scoped tool 'search_my_contract' is authorized.`;
      step4.code = `route = "search_my_contract"\nauthorized_context_builder.verify(user_id="${p.id}", owner_id="${p.id}")`;
    } else if (personaKey === 'alice') {
      step4.summary = `Access Granted (HR Admin). Authorized to view employee contracts.`;
      step4.details = `Alice holds 'can_view_employee_contracts' permission. The tool 'hr_search_employee_contract' is authorized. The action is marked for security audit logging.`;
      step4.code = `route = "hr_search_employee_contract"\nassert "can_view_employee_contracts" in permission_codes\naudit_service.log_access(user_id="${p.id}", target="usr_crissknot_001")`;
    } else {
      step4.status = "failed";
      step4.summary = `Access Denied. Insufficient permissions.`;
      step4.details = `${p.name} does not hold the 'can_view_employee_contracts' permission, and cannot read other employees' contracts.`;
      step4.code = `raise PermissionError("User ${p.id} lacks required permission 'can_view_employee_contracts'")`;
      trace.steps.push(step4);
      return trace;
    }
  } else if (scenarioKey === 'perf_config') {
    if (personaKey === 'alice') {
      step4.summary = `Access Granted. HR Admin holds cycle management permissions.`;
      step4.details = `Alice possesses 'can_manage_performance_cycles'. Performance configuration tools are authorized.`;
      step4.code = `assert "can_manage_performance_cycles" in permission_codes\n# Authorized tools: {"create_performance_cycle"}`;
    } else {
      step4.status = "failed";
      step4.summary = `Access Denied. Operational scope restricted.`;
      step4.details = `${p.name} lacks 'can_manage_performance_cycles'. The AI Tool Gating registry filters out performance configuration tools from the active prompt.`;
      step4.code = `# chat_tool_registry.filter_tools()\n# Removed: 'create_performance_cycle' due to missing permission.`;
      trace.steps.push(step4);
      return trace;
    }
  } else if (scenarioKey === 'notice_rag') {
    // Policy RAG is open to all tenants
    step4.summary = `Access Granted. Policy search tool is open to all authenticated users.`;
    step4.details = `The 'search_policy' tool is authorized for all system presets. Vector search will query collections scoped to tenant: '${p.tenant}'.`;
    step4.code = `# Collection target: ${p.tenant}_hr_documents\n# Tool Authorized: "search_policy"`;
  }
  
  trace.steps.push(step4);

  // Step 5: Retrieval Planning Pipeline (Only for RAG or Contract scenarios)
  if (scenarioKey === 'notice_rag' || (scenarioKey === 'view_contract' && step4.status === "success")) {
    let step5 = {
      title: "RAG & Retrieval Planning Pipeline",
      status: "success",
      summary: "",
      details: "",
      code: ""
    };

    if (scenarioKey === 'notice_rag') {
      step5.summary = `Retrieval Plan completed: Detected concept 'notice/resignation'. Quality: GOOD.`;
      step5.details = `The QueryUnderstandingService analyzes the question. It bypasses AI rewrites for simple queries and performs Concept Expansion on 'resignation' to generate 2 distinct vector search queries. Results are matched against '${p.tenant}_hr_documents' vector collection in Vector Database.`;
      step5.code = `RetrievalPlan(\n  route="search_policy",\n  original_question="${s.query}",\n  detected_concepts=["notice", "resignation"],\n  expanded_terms=["notice_period", "resignation_letter", "resign"],\n  queries=[\n    RetrievalQuery(text="${s.query}", source="original"),\n    RetrievalQuery(text="notice period resignation letter", source="concept_expansion")\n  ],\n  top_k_per_query=8\n)`;
    } else {
      // Contract search
      const coll = `${p.tenant}_hr_contracts`;
      step5.summary = `Contract Retrieval initialized. Scoped to collection '${coll}'.`;
      step5.details = `The retrieval service checks relational database to confirm the active document hash before performing vector lookup in Vector Store. In contract lane, authorization is checked per chunk to ensure sensitive blocks are only visible to authorized roles.`;
      step5.code = `authorized_context_builder.verify_contract_access(tenant_id="${p.tenant}", target_user="usr_crissknot_001")\n# Query Vector collection: '${coll}'\n# Post-Filter chunks: authorized=True`;
    }
    trace.steps.push(step5);
  }

  // Step 6: Confirmation Loop & Cache Pending Store (Only for Writes)
  if (s.expectedAction === 'prepare_write') {
    let step6 = {
      title: "Temporary Pending Confirmation Store",
      status: "success",
      summary: "Action cached in temporary store. Confirmation requested from user.",
      details: "To prevent accidental AI actions, write operations are staged. The backend serializes the prepared tool call parameters and saves them in temporary memory store with a 15-minute TTL. The user is prompted to type 'yes' to commit.",
      code: `cache.set(\n  "chat:pending_confirmation:${p.tenant}:${p.id}",\n  json.dumps({ "tool": "submit_my_leave", "params": {"days": 3, "start": "Monday"} }),\n  ex=900\n)`
    };
    trace.steps.push(step6);
  }

  // Step 7: Execution, Audit Store Logging, and Output
  let step7 = {
    title: "Audit Logging & Database Commit",
    status: "success",
    summary: "",
    details: "",
    code: ""
  };

  if (s.expectedAction === 'prepare_write') {
    step7.summary = "Request completed. Prepared reply sent back to client.";
    step7.details = "The tool has been staged. A dialogue block is generated asking Mike/Sarah to confirm.";
    step7.code = `HTTP/1.1 200 OK\n\n{ "response": "I've prepared your leave application for 3 days starting next Monday. Would you like me to submit it?" }`;
  } else if (scenarioKey === 'leave_balance') {
    step7.summary = `Leave balance fetched from ${p.tenant}.leave_balances.`;
    step7.details = `Database query returned balance info. Database transaction committed and closed.`;
    step7.code = `SELECT annual, medical FROM ${p.tenant}.leave_balances WHERE user_id = '${p.id}'\n# Return: Annual=8, Medical=2`;
  } else if (scenarioKey === 'view_contract') {
    step7.summary = `Audit log pushed to Audit Database. Contract context built.`;
    step7.details = `If called by HR Admin (Alice), a structured log containing the target, accessor, and purpose is pushed asynchronously to Audit Database to maintain compliance. The matching chunks are formatted as context for the AI.`;
    step7.code = `INSERT INTO audit_store.chat_audit_logs (\n  event_time, tenant_id, actor_id, event_type, target_id, description\n) VALUES (\n  now(), "${p.tenant}", "${p.id}", "contract_access", "usr_crissknot_001", "Searched contract for Sarah Jenkins"\n)`;
  } else if (scenarioKey === 'perf_config') {
    step7.summary = `Performance cycle settings saved to relational Database.`;
    step7.details = `The configuration is written to the database. Transactions committed in '${p.tenant}' schema.`;
    step7.code = `INSERT INTO ${p.tenant}.performance_cycles (name, status) VALUES ("Q3 Performance Cycle", "draft")`;
  } else if (scenarioKey === 'notice_rag') {
    step7.summary = `Policy chunks successfully retrieved and compiled.`;
    step7.details = `Vector database returns matching policy text fragments. AI synthesizes response citing 'Notice Policy Rev 2'.`;
    step7.code = `# AI Prompt Input:\n# Context: [Chunk 1: Under Crissknot notice policy, standard resignation notice is 30 days...]\n# User: ${s.query}\n# Output: According to Crissknot's Notice Policy, your notice period is 30 days.`;
  }

  trace.steps.push(step7);
  return trace;
}

// Export functions for HTML usage
window.personas = personas;
window.scenarios = scenarios;
window.runSimulation = runSimulation;

// Handle interactive UI tabs and views
document.addEventListener("DOMContentLoaded", () => {
  const ceoToggle = document.getElementById("ceo-view-btn");
  const archToggle = document.getElementById("arch-view-btn");
  const ceoSection = document.getElementById("ceo-section");
  const archSection = document.getElementById("arch-section");
  
  let mermaidRendered = false;

  if (ceoToggle && archToggle && ceoSection && archSection) {
    ceoToggle.addEventListener("click", () => {
      ceoToggle.classList.add("bg-brand-600", "text-white");
      ceoToggle.classList.remove("text-slate-600", "hover:text-slate-900");
      archToggle.classList.remove("bg-brand-600", "text-white");
      archToggle.classList.add("text-slate-600", "hover:text-slate-900");
      
      ceoSection.classList.remove("hidden");
      archSection.classList.add("hidden");
    });

    archToggle.addEventListener("click", () => {
      archToggle.classList.add("bg-brand-600", "text-white");
      archToggle.classList.remove("text-slate-600", "hover:text-slate-900");
      ceoToggle.classList.remove("bg-brand-600", "text-white");
      ceoToggle.classList.add("text-slate-600", "hover:text-slate-900");
      
      archSection.classList.remove("hidden");
      ceoSection.classList.add("hidden");

      // Dynamically compile Mermaid charts once the tab container is visible!
      if (!mermaidRendered && window.mermaid) {
        window.mermaid.run();
        mermaidRendered = true;
      }
    });
  }

  // Populate persona select options
  const personaSelect = document.getElementById("persona-select");
  const scenarioSelect = document.getElementById("scenario-select");
  const runBtn = document.getElementById("run-sim-btn");
  const resultsContainer = document.getElementById("sim-results");

  if (personaSelect && scenarioSelect && runBtn && resultsContainer) {
    // Set initial simulator states
    Object.keys(personas).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${personas[key].name} (${personas[key].role})`;
      personaSelect.appendChild(opt);
    });

    Object.keys(scenarios).forEach(key => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = scenarios[key].title;
      scenarioSelect.appendChild(opt);
    });

    // Run first simulation on page load
    executeSim();

    runBtn.addEventListener("click", executeSim);

    function executeSim() {
      const pk = personaSelect.value;
      const sk = scenarioSelect.value;
      const trace = runSimulation(pk, sk);
      
      if (!trace) return;

      resultsContainer.innerHTML = "";

      // Show header summary
      const summaryDiv = document.createElement("div");
      summaryDiv.className = "p-4 mb-6 rounded-xl bg-slate-900/40 border border-slate-700/60";
      
      const badgeColor = trace.steps[trace.steps.length - 1].status === 'failed' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      const badgeText = trace.steps[trace.steps.length - 1].status === 'failed' ? 'Blocked / Denied' : 'Success';

      summaryDiv.innerHTML = `
        <div class="flex justify-between items-start flex-wrap gap-2">
          <div>
            <h4 class="text-sm font-semibold text-white">Simulation Scenario: "${trace.scenario.query}"</h4>
            <p class="text-xs text-slate-400 mt-1">Accessor: <span class="text-slate-300 font-medium">${trace.persona.name}</span> | Tenant: <span class="text-slate-300 font-medium">${trace.persona.tenant}</span></p>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor}">${badgeText}</span>
        </div>
      `;
      resultsContainer.appendChild(summaryDiv);

      // Render step items
      trace.steps.forEach((step, idx) => {
        const stepDiv = document.createElement("div");
        stepDiv.className = `relative pl-8 pb-8 border-l-2 ${step.status === 'failed' ? 'border-red-500/30' : 'border-brand-500/30'} last:pb-0 last:border-l-0`;
        
        const statusIcon = step.status === 'failed' ? 
          `<div class="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-[10px] text-white font-bold ring-4 ring-slate-900">✕</div>` : 
          `<div class="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-[10px] text-white font-bold ring-4 ring-slate-900">${idx + 1}</div>`;

        stepDiv.innerHTML = `
          ${statusIcon}
          <div class="bg-slate-900/30 border border-slate-800/60 p-5 rounded-xl transition-all duration-300 hover:border-slate-700/60">
            <h5 class="text-sm font-semibold text-slate-200">${step.title}</h5>
            <p class="text-xs text-slate-400 mt-1.5">${step.summary}</p>
            <p class="text-xs text-slate-500 mt-2 leading-relaxed whitespace-pre-line">${step.details}</p>
          </div>
        `;
        resultsContainer.appendChild(stepDiv);
      });
    }
  }

  // Sequence Diagram Click-to-Zoom Modal Handler
  const seqDiagContainer = document.querySelector(".mermaid-container-seq");
  const modal = document.getElementById("diagram-modal");
  const modalContent = document.getElementById("modal-content");
  const closeModalBtn = document.getElementById("close-modal-btn");

  if (seqDiagContainer && modal && modalContent && closeModalBtn) {
    seqDiagContainer.addEventListener("click", () => {
      const renderedSvg = seqDiagContainer.querySelector(".mermaid svg") || seqDiagContainer.querySelector("svg:last-of-type");
      if (renderedSvg) {
        // Clone and inject the SVG element into the modal content container
        const clonedSvg = renderedSvg.cloneNode(true);
        clonedSvg.style.width = "100%";
        clonedSvg.style.height = "auto";
        clonedSvg.style.maxHeight = "75vh";
        
        modalContent.innerHTML = "";
        modalContent.appendChild(clonedSvg);
        modal.classList.remove("hidden");
      }
    });

    closeModalBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      modalContent.innerHTML = "";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        modalContent.innerHTML = "";
      }
    });
  }

  // Interactive Role Preset Grid Selector
  const presetBtns = {
    employee: document.getElementById("preset-btn-employee"),
    manager: document.getElementById("preset-btn-manager"),
    hr: document.getElementById("preset-btn-hr")
  };

  const presetPerms = {
    employee: ["can_use_chat"],
    manager: ["can_use_chat", "can_manage_team", "can_approve_leave"],
    hr: [
      "can_use_chat", "can_view_admin_hub", "can_view_audit_logs", 
      "can_manage_roles_permissions", "can_manage_team", "can_manage_employees", 
      "can_manage_users", "can_view_hr_reports", "can_manage_performance_cycles", 
      "can_manage_cycle_eligibility", "can_view_performance_reports", 
      "can_manage_policy_documents", "can_manage_contract_documents", 
      "can_view_employee_contracts", "can_approve_leave", 
      "can_manage_leave_configuration", "can_manage_leave_balances"
    ]
  };

  if (presetBtns.employee && presetBtns.manager && presetBtns.hr) {
    const allPermBadges = document.querySelectorAll("[data-perm]");

    const activatePreset = (presetKey) => {
      // Toggle button classes
      Object.keys(presetBtns).forEach(key => {
        const btn = presetBtns[key];
        if (key === presetKey) {
          btn.classList.add("ring-2", "ring-brand-500", "bg-brand-950/20", "border-brand-500/40");
          btn.classList.remove("border-slate-800", "bg-slate-900/40");
        } else {
          btn.classList.remove("ring-2", "ring-brand-500", "bg-brand-950/20", "border-brand-500/40");
          btn.classList.add("border-slate-800", "bg-slate-900/40");
        }
      });

      // Highlight permissions
      const activePerms = presetPerms[presetKey];
      allPermBadges.forEach(badge => {
        const permName = badge.getAttribute("data-perm");
        const statusInd = badge.querySelector(".status-indicator");
        
        if (activePerms.includes(permName)) {
          // Highlight
          badge.classList.remove("opacity-20", "text-slate-600", "bg-slate-950/20", "border-slate-900");
          badge.classList.add("text-emerald-400", "bg-emerald-950/30", "border-emerald-500/40", "opacity-100");
          if (statusInd) {
            statusInd.classList.remove("bg-slate-600");
            statusInd.classList.add("bg-emerald-500");
          }
        } else {
          // Fade
          badge.classList.add("opacity-20", "text-slate-600", "bg-slate-950/20", "border-slate-900");
          badge.classList.remove("text-emerald-400", "bg-emerald-950/30", "border-emerald-500/40", "opacity-100");
          if (statusInd) {
            statusInd.classList.add("bg-slate-600");
            statusInd.classList.remove("bg-emerald-500");
          }
        }
      });
    };

    // Click events
    presetBtns.employee.addEventListener("click", () => activatePreset("employee"));
    presetBtns.manager.addEventListener("click", () => activatePreset("manager"));
    presetBtns.hr.addEventListener("click", () => activatePreset("hr"));

    // Activate default preset (employee) on load
    activatePreset("employee");
  }
});

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
