const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const calendarGrid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");
const detailPanel = document.getElementById("detailPanel");
const detailDate = document.getElementById("detailDate");
const detailValue = document.getElementById("detailValue");
const detailNote = document.getElementById("detailNote");
const monthlyTotals = document.getElementById("monthlyTotals");
const monthlyTotalsTitle = document.getElementById("monthlyTotalsTitle");
const yearlyTotals = document.getElementById("yearlyTotals");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const toggleMorning = document.getElementById("toggleMorning");
const toggleAfternoon = document.getElementById("toggleAfternoon");
const toggleClear = document.getElementById("toggleClear");

const config = window.SUPABASE_CONFIG || {};
const hasConfig = Boolean(
  config.url &&
    config.anonKey &&
    !config.url.includes("SEU-PROJETO") &&
    !config.anonKey.includes("SUA-ANON-KEY")
);
const canCreateClient =
  hasConfig && window.supabase && typeof window.supabase.createClient === "function";
const supabaseClient = canCreateClient
  ? window.supabase.createClient(config.url, config.anonKey)
  : null;

let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();
let entries = [];
let entriesByDate = new Map();
let selectedDateIso = null;

function formatIsoDate(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const date = String(day).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function formatDateLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} de ${MONTHS_PT[month - 1]} de ${year}`;
}

function parseIsoYear(isoDate) {
  return Number(isoDate.split("-")[0]);
}

function dayValue(morning, afternoon) {
  return (morning ? 0.5 : 0) + (afternoon ? 0.5 : 0);
}

function updateEntriesMap(list) {
  entriesByDate = new Map();
  list.forEach((item) => {
    entriesByDate.set(item.date, item);
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  monthTitle.textContent = `${MONTHS_PT[currentMonth]} de ${currentYear}`;
  monthlyTotalsTitle.textContent = `Totais por mês (${currentYear})`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDay; i += 1) {
    const placeholder = document.createElement("div");
    placeholder.className = "day outside";
    placeholder.textContent = "";
    calendarGrid.appendChild(placeholder);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoDate = formatIsoDate(currentYear, currentMonth, day);
    const entry = entriesByDate.get(isoDate);
    const value = entry ? dayValue(entry.morning, entry.afternoon) : 0;

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day";
    cell.textContent = String(day);
    cell.dataset.date = isoDate;

    if (selectedDateIso === isoDate) {
      cell.classList.add("selected");
    }

    if (value > 0) {
      cell.classList.add("rainy");
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = value === 1 ? "1,0" : "0,5";
      cell.appendChild(badge);
    }

    cell.addEventListener("click", () => {
      selectDate(isoDate);
    });

    calendarGrid.appendChild(cell);
  }
}

function updateDetailPanel(entry) {
  if (!selectedDateIso) {
    detailDate.textContent = "Selecione um dia";
    detailValue.textContent = "0,0 dia";
    detailNote.textContent = "";
    toggleMorning.classList.remove("active");
    toggleAfternoon.classList.remove("active");
    return;
  }

  const morning = entry?.morning ?? false;
  const afternoon = entry?.afternoon ?? false;
  const value = dayValue(morning, afternoon);

  detailDate.textContent = formatDateLabel(selectedDateIso);
  detailValue.textContent = value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }) + " dia";

  toggleMorning.classList.toggle("active", morning);
  toggleAfternoon.classList.toggle("active", afternoon);

  if (value === 0) {
    detailNote.textContent = "Sem chuva registrada.";
  } else if (value === 0.5) {
    detailNote.textContent = "Conta meio dia de chuva.";
  } else {
    detailNote.textContent = "Conta um dia inteiro de chuva.";
  }
}

function renderMonthlyTotals(list) {
  const totals = new Array(12).fill(0);
  list.forEach((entry) => {
    const [year, month] = entry.date.split("-").map(Number);
    if (year !== currentYear) {
      return;
    }
    totals[month - 1] += dayValue(entry.morning, entry.afternoon);
  });

  monthlyTotals.innerHTML = "";
  totals.forEach((total, index) => {
    const row = document.createElement("div");
    row.className = "total-item";
    row.innerHTML = `<span>${MONTHS_PT[index]}</span><span>${total.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}</span>`;
    monthlyTotals.appendChild(row);
  });
}

function renderYearlyTotals(list) {
  const totalsByYear = new Map();
  list.forEach((entry) => {
    const year = parseIsoYear(entry.date);
    totalsByYear.set(year, (totalsByYear.get(year) || 0) + dayValue(entry.morning, entry.afternoon));
  });

  const years = Array.from(totalsByYear.keys()).sort((a, b) => b - a);
  yearlyTotals.innerHTML = "";

  if (years.length === 0) {
    yearlyTotals.innerHTML = '<div class="total-item"><span>Nenhum registro</span><span>0,0</span></div>';
    return;
  }

  years.forEach((year) => {
    const row = document.createElement("div");
    row.className = "total-item";
    row.innerHTML = `<span>${year}</span><span>${totalsByYear
      .get(year)
      .toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>`;
    yearlyTotals.appendChild(row);
  });
}

function buildYearMonthTotals(list) {
  const totalsByYear = new Map();

  list.forEach((entry) => {
    const [year, month] = entry.date.split("-").map(Number);
    const value = dayValue(entry.morning, entry.afternoon);

    if (value <= 0) {
      return;
    }

    if (!totalsByYear.has(year)) {
      totalsByYear.set(year, new Array(12).fill(0));
    }

    totalsByYear.get(year)[month - 1] += value;
  });

  return new Map(Array.from(totalsByYear.entries()).sort((a, b) => b[0] - a[0]));
}

function getWatermarkImageDataUrl() {
  const watermarkElement = document.querySelector(".watermark");
  const imageSource = watermarkElement?.currentSrc || watermarkElement?.src;

  if (!imageSource) {
    return Promise.resolve(null);
  }

  const convertImageToDataUrl = (source) =>
    new Promise((resolve) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const context = canvas.getContext("2d");
        if (!context) {
          resolve(null);
          return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.globalAlpha = 0.14;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/png"));
      };

      image.onerror = () => resolve(null);
      image.src = source;
    });

  return convertImageToDataUrl(imageSource).then((result) => {
    if (result) {
      return result;
    }

    return fetch(imageSource)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Falha ao carregar logo");
        }
        return response.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(convertImageToDataUrl(reader.result));
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          })
      )
      .catch(() => null);
  });
}

async function generatePdfReport() {
  const jsPdfApi = window.jspdf;
  if (!jsPdfApi || !jsPdfApi.jsPDF) {
    detailNote.textContent = "Biblioteca de PDF indisponível.";
    detailNote.classList.add("notice");
    return;
  }

  const yearMonthTotals = buildYearMonthTotals(entries);
  const years = Array.from(yearMonthTotals.keys());

  if (years.length === 0) {
    detailNote.textContent = "Não há registros para exportar no PDF.";
    detailNote.classList.add("notice");
    return;
  }

  detailNote.classList.remove("notice");

  const { jsPDF } = jsPdfApi;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const watermarkDataUrl = await getWatermarkImageDataUrl();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 14;
  const right = pageWidth - 14;

  let y = 24;
  const bottomMargin = 16;

  const drawPageStyle = () => {
    doc.setFillColor(248, 250, 253);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    if (watermarkDataUrl) {
      const wmWidth = Math.min(165, pageWidth * 0.82);
      const wmHeight = wmWidth * 0.34;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;
      doc.addImage(watermarkDataUrl, "PNG", wmX, wmY, wmWidth, wmHeight, undefined, "FAST");
    }
  };

  drawPageStyle();

  doc.setTextColor(43, 61, 98);
  doc.setFontSize(18);
  doc.text("Relatório de dias de chuva", left, y);
  y += 6;

  doc.setTextColor(104, 118, 143);
  doc.setFontSize(10);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, left, y);
  y += 8;

  const ensureSpace = (neededHeight) => {
    if (y + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      drawPageStyle();
      y = 18;
    }
  };

  years.forEach((year) => {
    const monthTotals = yearMonthTotals.get(year);
    const monthsWithRain = monthTotals
      .map((total, index) => ({
        monthName: MONTHS_PT[index],
        total
      }))
      .filter((item) => item.total > 0);

    if (monthsWithRain.length === 0) {
      return;
    }

    const blockHeight = 14 + monthsWithRain.length * 6;
    ensureSpace(blockHeight);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(233, 238, 248);
    doc.roundedRect(left, y - 1.5, right - left, blockHeight, 3, 3, "FD");

    doc.setFillColor(229, 236, 255);
    doc.roundedRect(left + 0.8, y - 0.7, right - left - 1.6, 7.2, 2.5, 2.5, "F");

    doc.setTextColor(55, 78, 140);
    doc.setFontSize(13);
    doc.text(`Ano ${year}`, left + 3, y + 4.1);
    y += 10;

    doc.setTextColor(60, 75, 104);
    doc.setFontSize(11);
    monthsWithRain.forEach((item) => {
      ensureSpace(6);
      const totalLabel = item.total.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      });

      doc.setTextColor(98, 113, 140);
      doc.text(item.monthName, left + 4, y);

      doc.setTextColor(71, 95, 160);
      doc.text(`${totalLabel} dia(s)`, right - 4, y, { align: "right" });
      y += 6;
    });

    y += 2;
  });

  doc.save("dias-de-chuva.pdf");
}

function updateTotals() {
  renderMonthlyTotals(entries);
  renderYearlyTotals(entries);
}

function selectDate(isoDate) {
  selectedDateIso = isoDate;
  renderCalendar();
  updateDetailPanel(entriesByDate.get(isoDate));
}

async function saveEntry(isoDate, morning, afternoon) {
  if (!supabaseClient) {
    return;
  }

  if (!morning && !afternoon) {
    await supabaseClient.from("rain_days").delete().eq("date", isoDate);
    entries = entries.filter((entry) => entry.date !== isoDate);
    updateEntriesMap(entries);
    renderCalendar();
    updateTotals();
    updateDetailPanel(null);
    return;
  }

  const payload = {
    date: isoDate,
    morning,
    afternoon
  };

  const { data, error } = await supabaseClient
    .from("rain_days")
    .upsert(payload, { onConflict: "date" })
    .select("date, morning, afternoon")
    .single();

  if (error) {
    detailNote.textContent = "Erro ao salvar no Supabase.";
    detailNote.classList.add("notice");
    return;
  }

  detailNote.classList.remove("notice");

  entries = entries.filter((entry) => entry.date !== isoDate);
  entries.push(data);
  updateEntriesMap(entries);
  renderCalendar();
  updateTotals();
  updateDetailPanel(data);
}

function bindDetailActions() {
  toggleMorning.addEventListener("click", () => {
    if (!selectedDateIso) {
      return;
    }
    const current = entriesByDate.get(selectedDateIso);
    const morning = !(current?.morning ?? false);
    const afternoon = current?.afternoon ?? false;
    saveEntry(selectedDateIso, morning, afternoon);
  });

  toggleAfternoon.addEventListener("click", () => {
    if (!selectedDateIso) {
      return;
    }
    const current = entriesByDate.get(selectedDateIso);
    const morning = current?.morning ?? false;
    const afternoon = !(current?.afternoon ?? false);
    saveEntry(selectedDateIso, morning, afternoon);
  });

  toggleClear.addEventListener("click", () => {
    if (!selectedDateIso) {
      return;
    }
    saveEntry(selectedDateIso, false, false);
  });
}

async function loadEntries() {
  if (!supabaseClient) {
    detailNote.textContent = "Configure o Supabase para salvar os dados.";
    detailNote.classList.add("notice");
    return;
  }

  const { data, error } = await supabaseClient
    .from("rain_days")
    .select("date, morning, afternoon");
  if (error) {
    detailNote.textContent = "Não foi possível carregar os dados.";
    detailNote.classList.add("notice");
    return;
  }

  entries = data || [];
  updateEntriesMap(entries);
  renderCalendar();
  updateTotals();
}

function bindNavigation() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentMonth -= 1;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear -= 1;
    }
    renderCalendar();
    updateTotals();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentMonth += 1;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    renderCalendar();
    updateTotals();
  });
}

function initWeekdays() {
  const labels = document.querySelectorAll(".weekdays span");
  labels.forEach((label, index) => {
    label.textContent = WEEKDAY_LABELS[index];
  });
}

function bindExportAction() {
  if (!exportPdfBtn) {
    return;
  }

  exportPdfBtn.addEventListener("click", generatePdfReport);
}

function init() {
  initWeekdays();
  bindNavigation();
  bindDetailActions();
  bindExportAction();
  renderCalendar();
  updateDetailPanel(null);
  updateTotals();
  loadEntries();
}

init();
