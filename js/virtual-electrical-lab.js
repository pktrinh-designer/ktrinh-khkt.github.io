(function () {
  "use strict";

  const svgNS = "http://www.w3.org/2000/svg";

  const COMPONENTS = {
    battery: {
      name: "Nguồn điện",
      ports: ["positive", "negative"],
      portLabels: ["+", "−"],
      x: 130,
      y: 165,
      description: "Nguồn điện mô phỏng 3V",
    },

    switch: {
      name: "Công tắc",
      ports: ["in", "out"],
      portLabels: ["A", "B"],
      x: 350,
      y: 165,
      description: "Công tắc đóng hoặc mở",
    },

    lamp: {
      name: "Bóng đèn",
      ports: ["a", "b"],
      portLabels: ["A", "B"],
      x: 570,
      y: 165,
      description: "Thiết bị tiêu thụ điện",
    },

    resistor: {
      name: "Điện trở",
      ports: ["a", "b"],
      portLabels: ["A", "B"],
      x: 350,
      y: 295,
      description: "Điện trở mô phỏng",
    },
  };

  const state = {
    components: new Set(),
    wires: [],
    switchClosed: false,
    lastCheck: null,
  };

  const elements = {
    inventory: document.getElementById("component-inventory"),
    wireList: document.getElementById("wire-list"),
    from: document.getElementById("terminal-from"),
    to: document.getElementById("terminal-to"),
    connect: document.getElementById("connect-button"),
    reset: document.getElementById("reset-button"),
    check: document.getElementById("check-button"),
    switchToggle: document.getElementById("switch-toggle"),
    diagram: document.getElementById("circuit-diagram"),
    analysis: document.getElementById("analysis-result"),
    badge: document.getElementById("simulation-badge"),
    sourceStatus: document.getElementById("source-status"),
    switchStatus: document.getElementById("switch-status"),
    lampStatus: document.getElementById("lamp-status"),
    circuitStatus: document.getElementById("circuit-status"),
  };

  function createSvgElement(tag, attributes = {}) {
    const node = document.createElementNS(svgNS, tag);

    Object.entries(attributes).forEach(([key, value]) => {
      node.setAttribute(key, String(value));
    });

    return node;
  }

  function addSvgText(parent, x, y, text, className = "svg-label") {
    const node = createSvgElement("text", {
      x,
      y,
      class: className,
      "text-anchor": "middle",
    });

    node.textContent = text;
    parent.appendChild(node);

    return node;
  }

  function getComponentPortPosition(type, port) {
    const component = COMPONENTS[type];

    if (!component) return null;

    const { x, y } = component;

    const positions = {
      battery: {
        positive: { x: x - 40, y },
        negative: { x: x + 40, y },
      },
      switch: {
        in: { x: x - 40, y },
        out: { x: x + 40, y },
      },
      lamp: {
        a: { x: x - 40, y },
        b: { x: x + 40, y },
      },
      resistor: {
        a: { x: x - 40, y },
        b: { x: x + 40, y },
      },
    };

    return positions[type]?.[port] || null;
  }

  function getPortId(type, port) {
    return `${type}.${port}`;
  }

  function parsePortId(id) {
    const [type, port] = id.split(".");

    if (!COMPONENTS[type] || !COMPONENTS[type].ports.includes(port)) {
      return null;
    }

    return { type, port };
  }

  function getAllPortIds() {
    const result = [];

    state.components.forEach((type) => {
      COMPONENTS[type].ports.forEach((port) => {
        result.push(getPortId(type, port));
      });
    });

    return result;
  }

  function getPortName(id) {
    const parsed = parsePortId(id);

    if (!parsed) return id;

    const component = COMPONENTS[parsed.type];
    const index = component.ports.indexOf(parsed.port);

    return `${component.name} – Đầu ${component.portLabels[index]}`;
  }

  function hasComponent(type) {
    return state.components.has(type);
  }

  function hasWire(a, b) {
    return state.wires.some(
      (wire) =>
        (wire.from === a && wire.to === b) ||
        (wire.from === b && wire.to === a),
    );
  }

  function clearAnalysis() {
    state.lastCheck = null;

    elements.analysis.className = "analysis-result neutral";
    elements.analysis.innerHTML = `
      <span class="analysis-icon">ⓘ</span>
      <div>
        <strong>Chưa có kết quả kiểm tra</strong>
        <p>Hãy lắp ráp mạch rồi nhấn kiểm tra mạch điện.</p>
      </div>
    `;

    elements.badge.className = "simulation-badge neutral";
    elements.badge.textContent = "Chưa kiểm tra";
  }

  function addComponent(type) {
    if (!COMPONENTS[type]) return;

    if (state.components.has(type)) {
      showAnalysis(
        "warning",
        "Linh kiện đã tồn tại",
        `${COMPONENTS[type].name} đã có trong khu vực lắp ráp.`,
      );
      return;
    }

    state.components.add(type);
    clearAnalysis();
    renderAll();
  }

  function removeComponent(type) {
    if (!state.components.has(type)) return;

    state.components.delete(type);

    state.wires = state.wires.filter((wire) => {
      return (
        !wire.from.startsWith(`${type}.`) && !wire.to.startsWith(`${type}.`)
      );
    });

    if (type === "switch") {
      state.switchClosed = false;
    }

    clearAnalysis();
    renderAll();
  }

  function connectPorts() {
    const from = elements.from.value;
    const to = elements.to.value;

    if (!from || !to) {
      showAnalysis(
        "warning",
        "Chưa chọn đủ đầu nối",
        "Bạn cần chọn cả đầu nối thứ nhất và đầu nối thứ hai.",
      );
      return;
    }

    if (from === to) {
      showAnalysis(
        "warning",
        "Không thể nối cùng một đầu",
        "Hãy chọn hai đầu nối khác nhau.",
      );
      return;
    }

    if (hasWire(from, to)) {
      showAnalysis(
        "warning",
        "Dây dẫn đã tồn tại",
        "Hai đầu nối này đã được kết nối với nhau.",
      );
      return;
    }

    const fromInfo = parsePortId(from);
    const toInfo = parsePortId(to);

    if (!fromInfo || !toInfo) return;

    if (fromInfo.type === toInfo.type) {
      showAnalysis(
        "warning",
        "Kết nối không phù hợp",
        "Trong mô phỏng này, dây dẫn cần nối giữa hai linh kiện khác nhau.",
      );
      return;
    }

    if (
      state.wires.some(
        (wire) =>
          wire.from === from ||
          wire.to === from ||
          wire.from === to ||
          wire.to === to,
      )
    ) {
      showAnalysis(
        "warning",
        "Đầu nối đã được sử dụng",
        "Mỗi đầu nối chỉ được kết nối với một dây dẫn trong mô hình mạch nối tiếp này.",
      );
      return;
    }

    state.wires.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      from,
      to,
    });

    clearAnalysis();
    renderAll();
  }

  function removeWire(id) {
    state.wires = state.wires.filter((wire) => wire.id !== id);
    clearAnalysis();
    renderAll();
  }

  function updateTerminalOptions() {
    const previousFrom = elements.from.value;
    const previousTo = elements.to.value;

    const ports = getAllPortIds();

    function fillSelect(select, previousValue) {
      select.innerHTML = '<option value="">Chọn đầu nối</option>';

      ports.forEach((id) => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = getPortName(id);
        select.appendChild(option);
      });

      if (ports.includes(previousValue)) {
        select.value = previousValue;
      }
    }

    fillSelect(elements.from, previousFrom);
    fillSelect(elements.to, previousTo);
  }

  function renderInventory() {
    elements.inventory.innerHTML = "";

    if (state.components.size === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = "Chưa có linh kiện nào.";
      elements.inventory.appendChild(empty);
      return;
    }

    state.components.forEach((type) => {
      const item = document.createElement("div");
      item.className = "inventory-item";

      const name = document.createElement("span");
      name.textContent = COMPONENTS[type].name;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-component";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Xóa ${COMPONENTS[type].name}`);

      remove.addEventListener("click", () => removeComponent(type));

      item.append(name, remove);
      elements.inventory.appendChild(item);
    });

    document.querySelectorAll("[data-add]").forEach((button) => {
      const exists = state.components.has(button.dataset.add);
      button.disabled = exists;

      const symbol = button.querySelector(".add-symbol");
      if (symbol) symbol.textContent = exists ? "✓" : "+";
    });
  }

  function renderWireList() {
    elements.wireList.innerHTML = "";

    if (state.wires.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-text";
      empty.textContent = "Chưa có dây dẫn nào.";
      elements.wireList.appendChild(empty);
      return;
    }

    state.wires.forEach((wire) => {
      const item = document.createElement("div");
      item.className = "wire-item";

      const label = document.createElement("span");
      label.textContent = `${getPortName(wire.from)} ↔ ${getPortName(wire.to)}`;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-wire";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Xóa dây dẫn");

      remove.addEventListener("click", () => removeWire(wire.id));

      item.append(label, remove);
      elements.wireList.appendChild(item);
    });
  }

  function drawBattery(parent) {
    const group = createSvgElement("g");

    group.appendChild(
      createSvgElement("line", {
        x1: 105,
        y1: 140,
        x2: 105,
        y2: 190,
        stroke: "#2563eb",
        "stroke-width": 5,
      }),
    );

    group.appendChild(
      createSvgElement("line", {
        x1: 155,
        y1: 150,
        x2: 155,
        y2: 180,
        stroke: "#2563eb",
        "stroke-width": 3,
      }),
    );

    addSvgText(group, 105, 125, "+", "svg-label");
    addSvgText(group, 155, 125, "−", "svg-label");
    addSvgText(group, 130, 225, "Nguồn điện 3V");

    parent.appendChild(group);
  }

  function drawSwitch(parent) {
    const group = createSvgElement("g");

    group.appendChild(
      createSvgElement("circle", {
        cx: 310,
        cy: 165,
        r: 5,
        class: "svg-component",
      }),
    );

    group.appendChild(
      createSvgElement("circle", {
        cx: 390,
        cy: 165,
        r: 5,
        class: "svg-component",
      }),
    );

    group.appendChild(
      createSvgElement("line", {
        x1: 310,
        y1: 165,
        x2: state.switchClosed ? 390 : 380,
        y2: state.switchClosed ? 165 : 145,
        stroke: "#334155",
        "stroke-width": 3,
        "stroke-linecap": "round",
      }),
    );

    addSvgText(group, 350, 205, "Công tắc");
    addSvgText(
      group,
      350,
      225,
      state.switchClosed ? "Đang đóng" : "Đang mở",
      "svg-small-label",
    );

    parent.appendChild(group);
  }

  function drawLamp(parent) {
    const group = createSvgElement("g");
    const isOn = Boolean(state.lastCheck?.lampOn);

    group.appendChild(
      createSvgElement("circle", {
        cx: 570,
        cy: 165,
        r: 37,
        class: `svg-lamp-glow${isOn ? " on" : ""}`,
      }),
    );

    group.appendChild(
      createSvgElement("circle", {
        cx: 570,
        cy: 165,
        r: 23,
        class: "svg-component",
      }),
    );

    group.appendChild(
      createSvgElement("path", {
        d: "M558 153 L582 177 M582 153 L558 177",
        stroke: "#d69e20",
        "stroke-width": 3,
        "stroke-linecap": "round",
      }),
    );

    addSvgText(group, 570, 225, "Bóng đèn");

    parent.appendChild(group);
  }

  function drawResistor(parent) {
    const group = createSvgElement("g");

    group.appendChild(
      createSvgElement("rect", {
        x: 325,
        y: 275,
        width: 50,
        height: 40,
        rx: 5,
        class: "svg-component",
      }),
    );

    group.appendChild(
      createSvgElement("path", {
        d: "M330 295 L340 285 L350 305 L360 285 L370 295",
        fill: "none",
        stroke: "#7c58ba",
        "stroke-width": 2.5,
      }),
    );

    addSvgText(group, 350, 340, "Điện trở");

    parent.appendChild(group);
  }

  function renderDiagram() {
    const svg = elements.diagram;
    svg.innerHTML = "";

    if (state.components.size === 0) {
      addSvgText(
        svg,
        360,
        185,
        "Hãy thêm linh kiện để bắt đầu lắp ráp",
        "svg-empty",
      );
      return;
    }

    const wireLayer = createSvgElement("g");
    const componentLayer = createSvgElement("g");
    const terminalLayer = createSvgElement("g");

    state.wires.forEach((wire) => {
      const from = parsePortId(wire.from);
      const to = parsePortId(wire.to);

      if (!from || !to) return;

      const start = getComponentPortPosition(from.type, from.port);
      const end = getComponentPortPosition(to.type, to.port);

      if (!start || !end) return;

      const middleX = (start.x + end.x) / 2;

      const path = createSvgElement("path", {
        d: `M ${start.x} ${start.y} Q ${middleX} ${start.y} ${middleX} ${(start.y + end.y) / 2} Q ${middleX} ${end.y} ${end.x} ${end.y}`,
        class: `svg-wire${state.lastCheck?.lampOn ? " active" : ""}`,
      });

      wireLayer.appendChild(path);
    });

    if (hasComponent("battery")) drawBattery(componentLayer);
    if (hasComponent("switch")) drawSwitch(componentLayer);
    if (hasComponent("lamp")) drawLamp(componentLayer);
    if (hasComponent("resistor")) drawResistor(componentLayer);

    getAllPortIds().forEach((id) => {
      const parsed = parsePortId(id);
      const position = getComponentPortPosition(parsed.type, parsed.port);

      const connected = state.wires.some(
        (wire) => wire.from === id || wire.to === id,
      );

      const terminal = createSvgElement("circle", {
        cx: position.x,
        cy: position.y,
        r: 7,
        class: `svg-terminal${connected ? " connected" : ""}`,
      });

      terminalLayer.appendChild(terminal);
    });

    svg.append(wireLayer, componentLayer, terminalLayer);
  }

  function setMetric(element, value) {
    element.textContent = value;
  }

  function renderMetrics() {
    setMetric(
      elements.sourceStatus,
      hasComponent("battery") ? "Đã thêm" : "Chưa có",
    );

    setMetric(
      elements.switchStatus,
      hasComponent("switch")
        ? state.switchClosed
          ? "Đang đóng"
          : "Đang mở"
        : "Chưa có",
    );

    setMetric(
      elements.lampStatus,
      hasComponent("lamp")
        ? state.lastCheck?.lampOn
          ? "Đang sáng"
          : "Chưa sáng"
        : "Chưa có",
    );

    setMetric(
      elements.circuitStatus,
      state.lastCheck?.valid
        ? state.lastCheck.lampOn
          ? "Mạch đang hoạt động"
          : "Mạch đã lắp đúng"
        : "Chưa hoàn chỉnh",
    );

    elements.switchToggle.disabled = !hasComponent("switch");

    elements.switchToggle.textContent = state.switchClosed
      ? "Công tắc đang đóng"
      : "Công tắc đang mở";

    elements.switchToggle.classList.toggle("is-closed", state.switchClosed);

    elements.switchToggle.setAttribute(
      "aria-pressed",
      String(state.switchClosed),
    );
  }

  function renderAll() {
    renderInventory();
    renderWireList();
    updateTerminalOptions();
    renderDiagram();
    renderMetrics();
  }

  function showAnalysis(type, title, message) {
    const icons = {
      neutral: "ⓘ",
      success: "✓",
      warning: "⚠",
      error: "✕",
    };

    elements.analysis.className = `analysis-result ${type}`;
    elements.analysis.innerHTML = "";

    const icon = document.createElement("span");
    icon.className = "analysis-icon";
    icon.textContent = icons[type] || "ⓘ";

    const content = document.createElement("div");
    const heading = document.createElement("strong");
    const paragraph = document.createElement("p");

    heading.textContent = title;
    paragraph.textContent = message;

    content.append(heading, paragraph);
    elements.analysis.append(icon, content);

    elements.badge.className = `simulation-badge ${type}`;
    elements.badge.textContent =
      {
        neutral: "Chưa kiểm tra",
        success: "Hợp lệ",
        warning: "Cần chú ý",
        error: "Không hợp lệ",
      }[type] || "Chưa kiểm tra";
  }

  function buildGraph(assumeSwitchClosed = false) {
    const graph = new Map();

    function addNode(id) {
      if (!graph.has(id)) graph.set(id, []);
    }

    function addEdge(a, b) {
      addNode(a);
      addNode(b);
      graph.get(a).push(b);
      graph.get(b).push(a);
    }

    getAllPortIds().forEach(addNode);

    state.wires.forEach((wire) => {
      addEdge(wire.from, wire.to);
    });

    ["lamp", "resistor"].forEach((type) => {
      if (!hasComponent(type)) return;

      const [a, b] = COMPONENTS[type].ports.map((port) =>
        getPortId(type, port),
      );

      addEdge(a, b);
    });

    if (hasComponent("switch") && (state.switchClosed || assumeSwitchClosed)) {
      addEdge("switch.in", "switch.out");
    }

    return graph;
  }

  function findPath(graph, start, target) {
    if (!graph.has(start) || !graph.has(target)) return null;

    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === target) return path;

      for (const next of graph.get(current) || []) {
        if (visited.has(next)) continue;

        visited.add(next);
        queue.push([...path, next]);
      }
    }

    return null;
  }

  function validateCircuit() {
    const required = ["battery", "switch", "lamp"];
    const missing = required.filter((type) => !hasComponent(type));

    if (missing.length) {
      return {
        valid: false,
        type: "error",
        title: "Thiếu linh kiện cần thiết",
        message: `Mạch mẫu cần có: ${missing.map((type) => COMPONENTS[type].name).join(", ")}.`,
      };
    }

    if (state.components.size > 4) {
      return {
        valid: false,
        type: "error",
        title: "Cấu hình không hợp lệ",
        message: "Mô phỏng hiện chỉ hỗ trợ một bộ linh kiện cho mỗi loại.",
      };
    }

    const ports = getAllPortIds();

    const unusedPorts = ports.filter((port) => {
      return !state.wires.some(
        (wire) => wire.from === port || wire.to === port,
      );
    });

    if (unusedPorts.length) {
      return {
        valid: false,
        type: "warning",
        title: "Có đầu nối chưa được kết nối",
        message: `Bạn cần kiểm tra các đầu nối: ${unusedPorts.map(getPortName).join("; ")}.`,
      };
    }

    const graph = buildGraph(true);
    const path = findPath(graph, "battery.positive", "battery.negative");

    if (!path) {
      return {
        valid: false,
        type: "error",
        title: "Mạch chưa tạo thành vòng kín",
        message:
          "Chưa tìm thấy đường dẫn liên tục từ cực dương đến cực âm qua các linh kiện. Hãy kiểm tra lại cách nối dây.",
      };
    }

    const usedComponents = new Set(
      path.map((id) => parsePortId(id)?.type).filter(Boolean),
    );

    const unusedComponents = [...state.components].filter(
      (type) => !usedComponents.has(type),
    );

    if (unusedComponents.length) {
      return {
        valid: false,
        type: "warning",
        title: "Có linh kiện chưa tham gia mạch",
        message: `${unusedComponents.map((type) => COMPONENTS[type].name).join(", ")} chưa nằm trên đường dẫn của mạch.`,
      };
    }

    return {
      valid: true,
      type: "success",
      title: "Cấu hình mạch hợp lệ",
      message:
        "Các linh kiện đã được nối thành một vòng mạch kín theo quy tắc của mô hình. Hãy đóng công tắc để quan sát trạng thái hoạt động.",
      path,
    };
  }

  function checkCircuit() {
    const result = validateCircuit();

    if (!result.valid) {
      state.lastCheck = {
        valid: false,
        lampOn: false,
      };

      showAnalysis(result.type, result.title, result.message);
      renderDiagram();
      renderMetrics();
      return;
    }

    const lampOn = state.switchClosed;

    state.lastCheck = {
      valid: true,
      lampOn,
    };

    if (lampOn) {
      showAnalysis(
        "success",
        "Mạch hợp lệ – Bóng đèn đang sáng",
        "Mạch mô phỏng đã tạo thành vòng kín và công tắc đang đóng. Bóng đèn được mô phỏng ở trạng thái sáng.",
      );
    } else {
      showAnalysis(
        "success",
        "Cấu hình hợp lệ – Mạch đang mở",
        "Các linh kiện được nối đúng theo mạch mẫu. Công tắc đang mở nên đường dẫn bị ngắt và bóng đèn chưa sáng.",
      );
    }

    renderDiagram();
    renderMetrics();
  }

  function toggleSwitch() {
    if (!hasComponent("switch")) return;

    const wasValid = state.lastCheck?.valid === true;

    state.switchClosed = !state.switchClosed;

    if (wasValid) {
      checkCircuit();
    } else {
      clearAnalysis();
      renderAll();
    }
  }

  function resetLab() {
    state.components.clear();
    state.wires = [];
    state.switchClosed = false;
    state.lastCheck = null;

    clearAnalysis();
    renderAll();

    showAnalysis(
      "neutral",
      "Đã làm mới phòng thí nghiệm",
      "Bạn có thể bắt đầu một cấu hình mạch mới.",
    );
  }

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      addComponent(button.dataset.add);
    });
  });

  elements.connect.addEventListener("click", connectPorts);
  elements.check.addEventListener("click", checkCircuit);
  elements.reset.addEventListener("click", resetLab);
  elements.switchToggle.addEventListener("click", toggleSwitch);

  renderAll();
})();
