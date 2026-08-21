"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useYear } from "@/contexts/YearContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  Building,
  Package,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  GraduationCap,
  Banknote,
  X,
  Table,
  Download,
  FileText,
} from "lucide-react";
import { jsPDF } from "jspdf";

const COLORS = [
  "#dc2626",
  "#b91c1c",
  "#f87171",
  "#fca5a5",
  "#ef4444",
  "#991b1b",
  "#7f1d1d",
];

export default function LaporanPerbandingan() {
  const { tahun } = useYear();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<
    "subkegiatan" | "rekening" | "paket"
  >("subkegiatan");
  const [selectedBosp, setSelectedBosp] = useState<{
    title: string;
    data: any;
  } | null>(null);
  const [selectedChartData, setSelectedChartData] = useState<{
    title: string;
    type: "subkegiatan" | "rekening" | "sumberdana" | "paket";
    data: any;
  } | null>(null);
  const [selectedPaket, setSelectedPaket] = useState<{
    title: string;
    rincian: any[];
  } | null>(null);
  const [showAllSumberDana, setShowAllSumberDana] = useState(false);
  const [compMode, setCompMode] = useState<
    "induk-rkpd" | "induk-perubahan" | "rkpd-perubahan"
  >("induk-perubahan");
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    setIsExporting(true);

    // Beri waktu bagi React untuk merender ulang tabel tanpa batas scroll
    setTimeout(async () => {
      try {
        const element = document.getElementById("laporan-perbandingan-content");
        if (!element) return;

        // Gunakan dom-to-image-more sebagai pengganti html2canvas
        // @ts-ignore
        const domtoimage = (await import("dom-to-image-more")).default;

        const canvas = await domtoimage.toCanvas(element, {
          bgcolor: "#f8fafc",
          width: element.scrollWidth,
          height: element.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/png");

        // A4 size: 210 x 297 mm
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();
        }

        pdf.save(`Laporan_Perbandingan_${tahun}.pdf`);
      } catch (err: any) {
        console.error("Gagal export PDF:", err);
        alert(`Terjadi kesalahan saat memproses PDF: ${err?.message || err}`);
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/laporan/perbandingan?tahun=${tahun}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tahun]);

  const formatCurrency = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  };

  const formatSelisih = (induk: number, perubahan: number) => {
    const diff = perubahan - induk;
    if (diff > 0)
      return <span className="text-blue-600">+{formatCurrency(diff)}</span>;
    if (diff < 0)
      return <span className="text-red-600">{formatCurrency(diff)}</span>;
    return <span className="text-gray-500">Rp 0</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data || data.error)
    return (
      <div className="text-red-500 text-center">
        Error loading data: {data?.error || "Unknown error"}
      </div>
    );

  const { summary, chartData, topPaket, topSubKegiatan, topRekening } = data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl text-sm z-50">
          <p className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1">
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 py-0.5">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-semibold">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const ScoreCard = ({ title, item, icon: Icon, isBosp = false }: any) => {
    const baseVal =
      compMode === "induk-rkpd"
        ? item.induk
        : compMode === "rkpd-perubahan"
          ? item.rkpd
          : item.induk;
    const targetVal = compMode === "induk-rkpd" ? item.rkpd : item.perubahan;

    return (
      <div
        className={`bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all relative overflow-hidden group ${isBosp ? "cursor-pointer hover:shadow-md hover:border-red-200" : ""}`}
        onClick={() => isBosp && setSelectedBosp({ title, data: item })}
      >
        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
          <Icon className="w-24 h-24 text-primary" />
        </div>
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2 relative z-10">
          <div className="p-2 bg-red-50 rounded-lg text-primary">
            <Icon className="w-4 h-4" />
          </div>
          {title}
          {isBosp && (
            <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              Lihat Rincian
            </span>
          )}
        </h3>
        {compMode !== "rkpd-perubahan" && (
          <div className="flex justify-between items-end mb-2 relative z-10">
            <span
              className={`text-xs font-medium ${compMode.startsWith("induk") ? "text-primary" : "text-gray-500"}`}
            >
              Pagu Induk
            </span>
            <span className="text-sm font-semibold text-gray-600">
              {formatCurrency(item.induk)}
            </span>
          </div>
        )}
        {compMode !== "induk-perubahan" && (
          <div className="flex justify-between items-end mb-2 relative z-10">
            <span
              className={`text-xs font-medium ${compMode.includes("rkpd") ? "text-primary" : "text-gray-500"}`}
            >
              Pagu RKPD
            </span>
            <span className="text-sm font-semibold text-gray-600">
              {formatCurrency(item.rkpd)}
            </span>
          </div>
        )}
        {compMode !== "induk-rkpd" && (
          <div className="flex justify-between items-end mb-3 relative z-10">
            <span
              className={`text-xs font-medium ${compMode.includes("perubahan") ? "text-primary" : "text-gray-500"}`}
            >
              Pagu Perubahan
            </span>
            <span className="text-base font-bold text-gray-800">
              {formatCurrency(item.perubahan)}
            </span>
          </div>
        )}
        <div className="flex justify-between items-end mb-3 pt-3 border-t border-gray-100 relative z-10">
          <span className="text-xs text-green-600 font-medium">Realisasi</span>
          <span className="text-sm font-bold text-green-700">
            {formatCurrency(item.realisasi)}
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden relative z-10">
          <div
            className="bg-green-500 h-1.5 rounded-full"
            style={{
              width: `${targetVal > 0 ? Math.min(100, (item.realisasi / targetVal) * 100) : 0}%`,
            }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 relative z-10">
          <span className="text-[10px] font-medium text-gray-500">
            Selisih: {formatSelisih(baseVal, targetVal)}
          </span>
          <span className="text-[10px] text-gray-500 font-bold">
            {targetVal > 0
              ? ((item.realisasi / targetVal) * 100).toFixed(1)
              : 0}
            % Serap
          </span>
        </div>
      </div>
    );
  };

  const getChartDataForTabs = () => {
    if (!data) return [];
    if (activeChartTab === "subkegiatan") return data.topSubKegiatan;
    if (activeChartTab === "rekening") return data.topRekening;
    return (data.allPaket || data.topPaket).map((p: any) => ({
      ...p,
      paguInduk: p.induk,
      paguRkpd: p.rkpd,
      paguPerubahan: p.perubahan,
    }));
  };

  const handleExportExcel = () => {
    if (!data) return;
    const chartData = getChartDataForTabs();

    // Format data for excel
    const excelData = chartData.map((item: any) => {
      const base: any = {
        Nama: item.nama,
      };

      if (activeChartTab === "paket") {
        base["Sub Kegiatan"] = item.rincian
          ? Array.from(
              new Set(item.rincian.map((r: any) => r.subKegiatan)),
            ).join(", ")
          : "-";
        base["Sumber Dana"] = item.rincian
          ? Array.from(
              new Set(item.rincian.map((r: any) => r.sumberDana)),
            ).join(", ")
          : "-";
      }

      base["Pagu Induk"] = item.paguInduk;
      base["Pagu RKPD"] = item.paguRkpd || item.rkpd;
      base["Pagu Perubahan"] = item.paguPerubahan;
      base["Realisasi"] = item.realisasi;

      const targetVal =
        compMode === "induk-rkpd"
          ? item.paguRkpd || item.rkpd || item.paguInduk || item.induk
          : item.paguPerubahan || item.perubahan;
      base["Sisa Anggaran"] = targetVal - item.realisasi;
      base["Persentase Serapan (%)"] =
        targetVal > 0 ? ((item.realisasi / targetVal) * 100).toFixed(2) : 0;

      return base;
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeChartTab.toUpperCase());

    XLSX.writeFile(wb, `Perbandingan_${activeChartTab}_${tahun}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Toggle Comparison Mode */}
        <div className="flex bg-white p-2 rounded-xl shadow-sm border border-gray-100 w-full md:w-fit">
          <button
            onClick={() => setCompMode("induk-rkpd")}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${compMode === "induk-rkpd" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
          >
            Induk vs RKPD
          </button>
          <button
            onClick={() => setCompMode("induk-perubahan")}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${compMode === "induk-perubahan" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
          >
            Induk vs Perubahan
          </button>
          <button
            onClick={() => setCompMode("rkpd-perubahan")}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${compMode === "rkpd-perubahan" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}
          >
            RKPD vs Perubahan
          </button>
        </div>

        {/* Export PDF Button */}
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="w-full md:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm font-medium"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {isExporting ? "Memproses PDF..." : "Cetak PDF"}
        </button>
      </div>

      <div
        id="laporan-perbandingan-content"
        className="space-y-6 bg-[#f8fafc] p-2"
      >
        {/* Overview Cards */}
        <div className="mb-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group w-full flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="absolute -right-10 -top-10 opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <Building className="w-48 h-48 text-primary" />
            </div>
            {compMode !== "rkpd-perubahan" && (
              <div className="flex-1 text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 pr-0 md:pr-6">
                <p className="text-gray-500 text-sm font-medium mb-1">
                  Total Pagu Induk
                </p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(summary.pagu.induk)}
                </h3>
              </div>
            )}
            {compMode !== "induk-perubahan" && (
              <div
                className={`flex-1 text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 px-0 md:px-6 ${compMode === "rkpd-perubahan" ? "pl-0 md:pl-0 pr-0 md:pr-6" : ""}`}
              >
                <p className="text-gray-500 text-sm font-medium mb-1">
                  Total Pagu RKPD
                </p>
                <h3 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(summary.pagu.rkpd)}
                </h3>
              </div>
            )}
            {compMode !== "induk-rkpd" && (
              <div className="flex-1 text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 px-0 md:px-6">
                <p className="text-primary text-sm font-medium mb-1">
                  Total Pagu Perubahan
                </p>
                <h3 className="text-2xl font-bold text-primary">
                  {formatCurrency(summary.pagu.perubahan)}
                </h3>
              </div>
            )}
            <div className="flex-1 text-center md:text-left border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 px-0 md:px-6">
              <p className="text-gray-500 text-sm font-medium mb-1">
                Selisih Pagu
              </p>
              <h3 className="text-xl font-bold text-gray-700">
                {formatSelisih(
                  compMode === "induk-rkpd"
                    ? summary.pagu.induk
                    : compMode === "rkpd-perubahan"
                      ? summary.pagu.rkpd
                      : summary.pagu.induk,
                  compMode === "induk-rkpd"
                    ? summary.pagu.rkpd
                    : summary.pagu.perubahan,
                )}
              </h3>
            </div>
            <div className="flex-1 text-center md:text-left pl-0 md:pl-6">
              <p className="text-sm font-medium text-green-600 mb-1">
                Total Realisasi
              </p>
              <h3 className="text-2xl font-bold text-green-700">
                {formatCurrency(summary.pagu.realisasi)}
              </h3>
              <div className="mt-2 text-xs font-medium bg-green-50 text-green-700 px-3 py-1 rounded-full inline-block">
                {compMode === "induk-rkpd"
                  ? (
                      (summary.pagu.realisasi / summary.pagu.rkpd) *
                      100
                    ).toFixed(1)
                  : (
                      (summary.pagu.realisasi / summary.pagu.perubahan) *
                      100
                    ).toFixed(1)}
                % Serapan
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <ScoreCard title="Gaji PNS" item={summary.gajiPns} icon={Briefcase} />
          <ScoreCard
            title="Gaji PPPK"
            item={summary.gajiPppk}
            icon={Briefcase}
          />
          <ScoreCard
            title="Gaji PPPK Paruh Waktu"
            item={summary.gajiPppkParuhWaktu}
            icon={Briefcase}
          />
          <ScoreCard
            title="Tambahan Penghasilan (TPP)"
            item={summary.tpp}
            icon={Briefcase}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <ScoreCard
            title="Tunjangan Profesi (TPG)"
            item={summary.tpg}
            icon={GraduationCap}
          />
          <ScoreCard
            title="BOSP SD"
            item={summary.bospSd}
            icon={GraduationCap}
            isBosp={true}
          />
          <ScoreCard
            title="BOSP SMP"
            item={summary.bospSmp}
            icon={GraduationCap}
            isBosp={true}
          />
          <ScoreCard
            title="BOP PAUD"
            item={summary.bospPaud}
            icon={GraduationCap}
            isBosp={true}
          />
          <ScoreCard
            title="BOP Kesetaraan"
            item={summary.bospKesetaraan}
            icon={GraduationCap}
            isBosp={true}
          />
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                Distribusi Sumber Dana
              </h3>
              <button
                onClick={() => setShowAllSumberDana(true)}
                className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium hover:bg-red-200 transition-colors"
              >
                Lihat Detail
              </button>
            </div>
            <div className={isExporting ? "pr-2" : "h-80 overflow-y-auto pr-2"}>
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600">
                      Sumber Dana
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600">
                      {compMode === "induk-rkpd"
                        ? "Pagu Induk"
                        : compMode === "rkpd-perubahan"
                          ? "Pagu RKPD"
                          : "Pagu Induk"}
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-primary">
                      {compMode === "induk-rkpd"
                        ? "Pagu RKPD"
                        : "Pagu Perubahan"}
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-green-600">
                      Realisasi
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {chartData.map((sd: any, idx: number) => {
                    const baseVal =
                      compMode === "induk-rkpd"
                        ? sd.induk
                        : compMode === "rkpd-perubahan"
                          ? sd.rkpd || sd.induk
                          : sd.induk;
                    const targetVal =
                      compMode === "induk-rkpd"
                        ? sd.rkpd || sd.induk
                        : sd.perubahan;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          setSelectedChartData({
                            title: sd.name,
                            type: "sumberdana",
                            data: sd,
                          })
                        }
                      >
                        <td
                          className="px-2 py-2 font-medium text-gray-700 truncate max-w-[120px]"
                          title={sd.name}
                        >
                          {sd.name}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-600">
                          {formatCurrency(baseVal)}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-primary">
                          {formatCurrency(targetVal)}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-green-700">
                          {formatCurrency(sd.realisasi)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {targetVal > 0
                            ? ((sd.realisasi / targetVal) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Seluruh Kegiatan Teknis
            </h3>
            {isExporting ? (
              <div className="pr-2 relative mt-4">
                <table className="min-w-full divide-y divide-gray-100 text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold text-gray-600">
                        Nama Kegiatan
                      </th>
                      {compMode !== "rkpd-perubahan" && (
                        <th className="px-2 py-2 text-right font-semibold text-gray-600">
                          Pagu Induk
                        </th>
                      )}
                      {compMode !== "induk-perubahan" && (
                        <th className="px-2 py-2 text-right font-semibold text-gray-600">
                          Pagu RKPD
                        </th>
                      )}
                      {compMode !== "induk-rkpd" && (
                        <th className="px-2 py-2 text-right font-semibold text-gray-600">
                          Pagu Perubahan
                        </th>
                      )}
                      <th className="px-2 py-2 text-right font-semibold text-gray-600">
                        Realisasi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data.allPaket || []).map((paket: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2 font-medium text-gray-700">
                          {paket.nama}
                        </td>
                        {compMode !== "rkpd-perubahan" && (
                          <td className="px-2 py-2 text-right">
                            {formatCurrency(
                              paket.induk || paket.paguInduk || 0,
                            )}
                          </td>
                        )}
                        {compMode !== "induk-perubahan" && (
                          <td className="px-2 py-2 text-right">
                            {formatCurrency(paket.rkpd || paket.paguRkpd || 0)}
                          </td>
                        )}
                        {compMode !== "induk-rkpd" && (
                          <td className="px-2 py-2 text-right">
                            {formatCurrency(
                              paket.perubahan || paket.paguPerubahan || 0,
                            )}
                          </td>
                        )}
                        <td className="px-2 py-2 text-right">
                          {formatCurrency(paket.realisasi || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-80 overflow-y-auto pr-2 relative">
                <div
                  style={{
                    height: `${Math.max((data.allPaket || []).length * 40, 320)}px`,
                    minHeight: "100%",
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.allPaket || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={true}
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(value) =>
                          `${(value / 1000000).toFixed(0)}Jt`
                        }
                        style={{ fontSize: "11px" }}
                      />
                      <YAxis
                        dataKey="nama"
                        type="category"
                        width={120}
                        style={{ fontSize: "10px" }}
                        tick={{ fill: "#475569" }}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey={
                          compMode === "induk-rkpd" ? "rkpd" : "perubahan"
                        }
                        name={
                          compMode === "induk-rkpd"
                            ? "Pagu RKPD"
                            : "Pagu Perubahan"
                        }
                        fill="#fca5a5"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        onClick={(d: any) =>
                          setSelectedPaket({
                            title: d.payload?.nama || d.nama,
                            rincian: d.payload?.rincian || [],
                          })
                        }
                        cursor="pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {!isExporting && (
              <p className="text-[10px] text-gray-400 mt-2 text-center italic">
                * Klik pada batang grafik untuk melihat rincian.
              </p>
            )}
          </div>
        </div>

        {/* Tabs for Sub Kegiatan / Rekening */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-gray-100 pb-3 gap-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Perbandingan Pagu vs Realisasi
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveChartTab("subkegiatan")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === "subkegiatan" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Kegiatan
                </button>
                <button
                  onClick={() => setActiveChartTab("rekening")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === "rekening" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Rekening
                </button>
                <button
                  onClick={() => setActiveChartTab("paket")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeChartTab === "paket" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Uraian Paket
                </button>
              </div>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                title="Export Data Grafik ke Excel"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          <div
            style={{
              height: `${Math.max(500, getChartDataForTabs().length * 45)}px`,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={getChartDataForTabs()}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  tickFormatter={(value) =>
                    `${(value / 1000000000).toFixed(1)}M`
                  }
                  style={{ fontSize: "11px" }}
                />
                <YAxis
                  dataKey="nama"
                  type="category"
                  width={220}
                  style={{ fontSize: "10px" }}
                  tick={{ fill: "#475569" }}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                />
                <Bar
                  dataKey={
                    compMode === "induk-rkpd" ? "paguRkpd" : "paguPerubahan"
                  }
                  name={
                    compMode === "induk-rkpd" ? "Pagu RKPD" : "Pagu Perubahan"
                  }
                  fill="#dc2626"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  onClick={(data: any) =>
                    setSelectedChartData({
                      title: data.payload?.nama || data.nama,
                      type: activeChartTab,
                      data: data.payload || data,
                    })
                  }
                  cursor="pointer"
                />
                <Bar
                  dataKey="realisasi"
                  name="Realisasi"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  onClick={(data: any) =>
                    setSelectedChartData({
                      title: data.payload?.nama || data.nama,
                      type: activeChartTab,
                      data: data.payload || data,
                    })
                  }
                  cursor="pointer"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-400 mt-4 text-center italic">
            * Klik pada batang grafik (bar) untuk melihat tabel rincian data.
            Data Gaji & Tunjangan, PPPK Paruh Waktu, serta BOSP disembunyikan
            dari grafik ini.
          </p>
        </div>
      </div>

      {/* Chart Detail Modal */}
      {selectedChartData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Table className="w-5 h-5 text-primary" />
                Rincian{" "}
                {selectedChartData.type === "subkegiatan"
                  ? "Sub Kegiatan"
                  : selectedChartData.type === "sumberdana"
                    ? "Sumber Dana"
                    : selectedChartData.type === "paket"
                      ? "Uraian Paket"
                      : "Rekening"}
              </h3>
              <button
                onClick={() => setSelectedChartData(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              <h4 className="font-semibold text-primary mb-4">
                {selectedChartData.title}
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">
                        Uraian
                      </th>
                      <th className="px-4 py-3 text-right font-bold text-gray-600">
                        Nilai (Rp)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {compMode !== "rkpd-perubahan" && (
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-600">
                          Pagu Induk
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {formatCurrency(
                            selectedChartData.data.paguInduk ||
                              selectedChartData.data.induk,
                          )}
                        </td>
                      </tr>
                    )}
                    {compMode !== "induk-perubahan" && (
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-600">
                          Pagu RKPD
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800">
                          {formatCurrency(
                            selectedChartData.data.paguRkpd ||
                              selectedChartData.data.rkpd,
                          )}
                        </td>
                      </tr>
                    )}
                    {compMode !== "induk-rkpd" && (
                      <tr className="hover:bg-red-50">
                        <td className="px-4 py-3 font-medium text-primary">
                          Pagu Perubahan
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {formatCurrency(
                            selectedChartData.data.paguPerubahan ||
                              selectedChartData.data.perubahan,
                          )}
                        </td>
                      </tr>
                    )}
                    <tr className="hover:bg-green-50">
                      <td className="px-4 py-3 font-medium text-green-600">
                        Realisasi
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {formatCurrency(selectedChartData.data.realisasi)}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-4 py-3 font-medium text-gray-500 text-xs">
                        Selisih (Target - Base)
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sm">
                        {formatSelisih(
                          compMode === "induk-rkpd"
                            ? selectedChartData.data.paguInduk ||
                                selectedChartData.data.induk
                            : compMode === "rkpd-perubahan"
                              ? selectedChartData.data.paguRkpd ||
                                selectedChartData.data.rkpd ||
                                selectedChartData.data.paguInduk ||
                                selectedChartData.data.induk
                              : selectedChartData.data.paguInduk ||
                                selectedChartData.data.induk,
                          compMode === "induk-rkpd"
                            ? selectedChartData.data.paguRkpd ||
                                selectedChartData.data.rkpd
                            : selectedChartData.data.paguPerubahan ||
                                selectedChartData.data.perubahan,
                        )}
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-500 text-xs">
                        Persentase Serapan
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-sm text-gray-600">
                        {(() => {
                          const target =
                            compMode === "induk-rkpd"
                              ? selectedChartData.data.paguRkpd ||
                                selectedChartData.data.rkpd
                              : selectedChartData.data.paguPerubahan ||
                                selectedChartData.data.perubahan;
                          return target > 0
                            ? (
                                (selectedChartData.data.realisasi / target) *
                                100
                              ).toFixed(2)
                            : 0;
                        })()}
                        %
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedChartData(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kegiatan Teknis Detail Modal */}
      {selectedPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Rincian Kegiatan Teknis
              </h3>
              <button
                onClick={() => setSelectedPaket(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-bold text-primary mb-4 text-xl">
                {selectedPaket.title}
              </h4>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">
                        Sub Kegiatan
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">
                        Rekening
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-gray-600">
                        Sumber Dana
                      </th>
                      {compMode !== "rkpd-perubahan" && (
                        <th className="px-4 py-3 text-right font-bold text-gray-600">
                          Pagu Induk
                        </th>
                      )}
                      {compMode !== "induk-perubahan" && (
                        <th className="px-4 py-3 text-right font-bold text-gray-600">
                          Pagu RKPD
                        </th>
                      )}
                      {compMode !== "induk-rkpd" && (
                        <th className="px-4 py-3 text-right font-bold text-gray-600">
                          Pagu Perubahan
                        </th>
                      )}
                      <th className="px-4 py-3 text-right font-bold text-gray-600">
                        Realisasi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {selectedPaket.rincian.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          Belum ada rincian yang terdata
                        </td>
                      </tr>
                    ) : (
                      selectedPaket.rincian.map((r, i) => (
                        <tr
                          key={i}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-800 align-top">
                            {r.subKegiatan}
                          </td>
                          <td className="px-4 py-3 text-gray-600 align-top">
                            {r.rekening}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs align-top">
                            <span className="bg-gray-100 px-2 py-1 rounded-md">
                              {r.sumberDana}
                            </span>
                          </td>
                          {compMode !== "rkpd-perubahan" && (
                            <td className="px-4 py-3 text-right font-medium text-gray-500 align-top whitespace-nowrap">
                              {formatCurrency(r.paguInduk)}
                            </td>
                          )}
                          {compMode !== "induk-perubahan" && (
                            <td className="px-4 py-3 text-right font-medium text-gray-500 align-top whitespace-nowrap">
                              {formatCurrency(r.paguRkpd)}
                            </td>
                          )}
                          {compMode !== "induk-rkpd" && (
                            <td className="px-4 py-3 text-right font-semibold text-primary align-top whitespace-nowrap">
                              {formatCurrency(r.paguPerubahan)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-bold text-green-600 align-top whitespace-nowrap">
                            {formatCurrency(r.realisasi)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {selectedPaket.rincian.length > 0 && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-gray-700"
                        >
                          Total:
                        </td>
                        {compMode !== "rkpd-perubahan" && (
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(
                              selectedPaket.rincian.reduce(
                                (acc: any, curr: any) =>
                                  acc + (curr.paguInduk || 0),
                                0,
                              ),
                            )}
                          </td>
                        )}
                        {compMode !== "induk-perubahan" && (
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatCurrency(
                              selectedPaket.rincian.reduce(
                                (acc: any, curr: any) =>
                                  acc + (curr.paguRkpd || 0),
                                0,
                              ),
                            )}
                          </td>
                        )}
                        {compMode !== "induk-rkpd" && (
                          <td className="px-4 py-3 text-right text-primary">
                            {formatCurrency(
                              selectedPaket.rincian.reduce(
                                (acc: any, curr: any) =>
                                  acc + (curr.paguPerubahan || 0),
                                0,
                              ),
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-green-600">
                          {formatCurrency(
                            selectedPaket.rincian.reduce(
                              (acc, curr) => acc + (curr.realisasi || 0),
                              0,
                            ),
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right shrink-0">
              <button
                onClick={() => setSelectedPaket(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOSP Modal */}
      {selectedBosp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Rincian {selectedBosp.title}
              </h3>
              <button
                onClick={() => setSelectedBosp(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Reguler */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 border-b pb-1">
                  BOSP Reguler
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {compMode !== "rkpd-perubahan" && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Pagu Induk</p>
                      <p className="font-bold text-gray-700 text-sm">
                        {formatCurrency(selectedBosp.data.reguler.induk)}
                      </p>
                    </div>
                  )}
                  {compMode !== "induk-perubahan" && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Pagu RKPD</p>
                      <p className="font-bold text-gray-700 text-sm">
                        {formatCurrency(selectedBosp.data.reguler.rkpd)}
                      </p>
                    </div>
                  )}
                  {compMode !== "induk-rkpd" && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-50">
                      <p className="text-xs text-primary mb-1">
                        Pagu Perubahan
                      </p>
                      <p className="font-bold text-primary text-sm">
                        {formatCurrency(selectedBosp.data.reguler.perubahan)}
                      </p>
                    </div>
                  )}
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 mb-1">Realisasi</p>
                    <p className="font-bold text-green-700 text-sm">
                      {formatCurrency(selectedBosp.data.reguler.realisasi)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Kinerja */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 border-b pb-1">
                  BOSP Kinerja
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {compMode !== "rkpd-perubahan" && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Pagu Induk</p>
                      <p className="font-bold text-gray-700 text-sm">
                        {formatCurrency(selectedBosp.data.kinerja.induk)}
                      </p>
                    </div>
                  )}
                  {compMode !== "induk-perubahan" && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Pagu RKPD</p>
                      <p className="font-bold text-gray-700 text-sm">
                        {formatCurrency(selectedBosp.data.kinerja.rkpd)}
                      </p>
                    </div>
                  )}
                  {compMode !== "induk-rkpd" && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-50">
                      <p className="text-xs text-primary mb-1">
                        Pagu Perubahan
                      </p>
                      <p className="font-bold text-primary text-sm">
                        {formatCurrency(selectedBosp.data.kinerja.perubahan)}
                      </p>
                    </div>
                  )}
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 mb-1">Realisasi</p>
                    <p className="font-bold text-green-700 text-sm">
                      {formatCurrency(selectedBosp.data.kinerja.realisasi)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right">
              <button
                onClick={() => setSelectedBosp(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {showAllSumberDana && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                Semua Sumber Dana
              </h3>
              <button
                onClick={() => setShowAllSumberDana(false)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1 rounded-full shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        No
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        Sumber Dana
                      </th>
                      {compMode !== "rkpd-perubahan" && (
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">
                          Pagu Induk
                        </th>
                      )}
                      {compMode !== "induk-perubahan" && (
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">
                          Pagu RKPD
                        </th>
                      )}
                      {compMode !== "induk-rkpd" && (
                        <th className="px-4 py-3 text-right font-semibold text-primary">
                          Pagu Perubahan
                        </th>
                      )}
                      <th className="px-4 py-3 text-right font-semibold text-green-600">
                        Realisasi
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        Selisih Pagu
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">
                        % Serapan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {chartData.map((sd: any, idx: number) => {
                      const baseVal =
                        compMode === "induk-rkpd"
                          ? sd.induk
                          : compMode === "rkpd-perubahan"
                            ? sd.rkpd || sd.induk
                            : sd.induk;
                      const targetVal =
                        compMode === "induk-rkpd"
                          ? sd.rkpd || sd.induk
                          : sd.perubahan;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {sd.name}
                          </td>
                          {compMode !== "rkpd-perubahan" && (
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">
                              {formatCurrency(sd.paguInduk || sd.induk)}
                            </td>
                          )}
                          {compMode !== "induk-perubahan" && (
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">
                              {formatCurrency(sd.paguRkpd || sd.rkpd)}
                            </td>
                          )}
                          {compMode !== "induk-rkpd" && (
                            <td className="px-4 py-3 text-right font-bold text-primary">
                              {formatCurrency(sd.perubahan)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-bold text-green-700">
                            {formatCurrency(sd.realisasi)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-sm">
                            {formatSelisih(baseVal, targetVal)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {targetVal > 0
                                ? ((sd.realisasi / targetVal) * 100).toFixed(2)
                                : 0}
                              %
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0 border-t border-gray-200">
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-right text-gray-700 font-bold"
                      >
                        Total:
                      </td>
                      {compMode !== "rkpd-perubahan" && (
                        <td className="px-4 py-3 text-right text-gray-800 font-bold">
                          {formatCurrency(
                            chartData.reduce(
                              (acc: number, curr: any) =>
                                acc + (curr.paguInduk || curr.induk || 0),
                              0,
                            ),
                          )}
                        </td>
                      )}
                      {compMode !== "induk-perubahan" && (
                        <td className="px-4 py-3 text-right text-gray-800 font-bold">
                          {formatCurrency(
                            chartData.reduce(
                              (acc: number, curr: any) =>
                                acc +
                                (curr.paguRkpd || curr.rkpd || curr.induk || 0),
                              0,
                            ),
                          )}
                        </td>
                      )}
                      {compMode !== "induk-rkpd" && (
                        <td className="px-4 py-3 text-right text-primary font-bold">
                          {formatCurrency(
                            chartData.reduce(
                              (acc: number, curr: any) =>
                                acc + (curr.perubahan || 0),
                              0,
                            ),
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-green-700 font-bold">
                        {formatCurrency(
                          chartData.reduce(
                            (acc: number, curr: any) =>
                              acc + (curr.realisasi || 0),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {(() => {
                          const baseTotal =
                            compMode === "induk-rkpd"
                              ? chartData.reduce(
                                  (acc: number, curr: any) =>
                                    acc + (curr.paguInduk || curr.induk || 0),
                                  0,
                                )
                              : compMode === "rkpd-perubahan"
                                ? chartData.reduce(
                                    (acc: number, curr: any) =>
                                      acc +
                                      (curr.paguRkpd ||
                                        curr.rkpd ||
                                        curr.induk ||
                                        0),
                                    0,
                                  )
                                : chartData.reduce(
                                    (acc: number, curr: any) =>
                                      acc + (curr.paguInduk || curr.induk || 0),
                                    0,
                                  );
                          const targetTotal =
                            compMode === "induk-rkpd"
                              ? chartData.reduce(
                                  (acc: number, curr: any) =>
                                    acc +
                                    (curr.paguRkpd ||
                                      curr.rkpd ||
                                      curr.induk ||
                                      0),
                                  0,
                                )
                              : chartData.reduce(
                                  (acc: number, curr: any) =>
                                    acc + (curr.perubahan || 0),
                                  0,
                                );
                          return formatSelisih(baseTotal, targetTotal);
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800">
                        {(() => {
                          const totalRealisasi = chartData.reduce(
                            (acc: number, curr: any) =>
                              acc + (curr.realisasi || 0),
                            0,
                          );
                          const targetTotal =
                            compMode === "induk-rkpd"
                              ? chartData.reduce(
                                  (acc: number, curr: any) =>
                                    acc +
                                    (curr.paguRkpd ||
                                      curr.rkpd ||
                                      curr.induk ||
                                      0),
                                  0,
                                )
                              : chartData.reduce(
                                  (acc: number, curr: any) =>
                                    acc + (curr.perubahan || 0),
                                  0,
                                );
                          return targetTotal > 0
                            ? ((totalRealisasi / targetTotal) * 100).toFixed(2)
                            : 0;
                        })()}
                        %
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right shrink-0">
              <button
                onClick={() => setShowAllSumberDana(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
