"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  PhShield, 
  PhWarning, 
  PhX, 
  PhRefresh, 
  PhChartLine,
  PhLock,
  PhUnlock,
  PhGauge,
  PhUsers,
  PhClock
} from "@phosphor-icons/react";

export default function RateLimitingTab() {
  const [data, setData] = useState({
    recentViolations: [],
    stats: { hits: [], violations: [] },
    configs: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [suspiciousIPs, setSuspiciousIPs] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/rate-limits");
      if (!response.ok) throw new Error("Failed to fetch rate limiting data");
      
      const result = await response.json();
      if (result.ok) {
        setData(result.data);
      }
    } catch (error) {
      toast.error("Failed to load rate limiting data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuspiciousIPs = async () => {
    try {
      const response = await fetch("/api/admin/security/suspicious-ips");
      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          setSuspiciousIPs(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch suspicious IPs:", error);
    }
  };

  const clearViolation = async (endpointType, identifier) => {
    try {
      const response = await fetch("/api/admin/rate-limits/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointType, identifier })
      });
      
      if (!response.ok) throw new Error("Failed to clear violation");
      
      toast.success("Rate limit violation cleared");
      fetchData();
    } catch (error) {
      toast.error("Failed to clear violation");
      console.error(error);
    }
  };

  const updateConfig = async (config) => {
    try {
      const response = await fetch("/api/admin/rate-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) throw new Error("Failed to update configuration");
      
      toast.success("Rate limit configuration updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update configuration");
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSuspiciousIPs();
  }, []);

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleString();
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50';
      case 'LOW': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-brand border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Violations (24h)</p>
              <p className="text-2xl font-bold text-pup-maroon">
                {data.stats.violations.reduce((sum, v) => sum + parseInt(v.violations || 0), 0)}
              </p>
            </div>
            <PhShield className="w-8 h-8 text-pup-maroon" />
          </div>
        </div>
        
        <div className="bg-white rounded-brand border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">API Requests (24h)</p>
              <p className="text-2xl font-bold text-pup-maroon">
                {data.stats.hits.reduce((sum, h) => sum + parseInt(h.hits || 0), 0)}
              </p>
            </div>
            <PhChartLine className="w-8 h-8 text-pup-maroon" />
          </div>
        </div>
        
        <div className="bg-white rounded-brand border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Suspicious IPs</p>
              <p className="text-2xl font-bold text-pup-maroon">{suspiciousIPs.length}</p>
            </div>
            <PhWarning className="w-8 h-8 text-pup-maroon" />
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="bg-white rounded-brand border border-gray-200">
        <div className="p-4 bg-gray-50/50 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Recent Rate Limit Violations</h3>
        </div>
        <div className="overflow-x-auto">
          {data.recentViolations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <PhShield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent violations</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Type</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Identifier</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">IP Address</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Violations</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Lockout Until</th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-50">
                    <td className="p-3 text-sm">{violation.endpoint_type}</td>
                    <td className="p-3 text-sm font-mono text-xs">{violation.identifier}</td>
                    <td className="p-3 text-sm font-mono text-xs">{violation.ip_address}</td>
                    <td className="p-3 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {violation.violation_count}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {violation.lockout_until ? formatTime(violation.lockout_until) : 'None'}
                    </td>
                    <td className="p-3 text-sm">
                      <button
                        onClick={() => clearViolation(violation.endpoint_type, violation.identifier)}
                        className="text-pup-maroon hover:text-red-900 flex items-center gap-1"
                      >
                        <PhUnlock className="w-4 h-4" />
                        Clear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  const renderConfigurations = () => (
    <div className="bg-white rounded-brand border border-gray-200">
      <div className="p-4 bg-gray-50/50 border-b border-gray-200">
        <h3 className="font-bold text-gray-900">Rate Limit Configurations</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Endpoint Type</th>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Window (seconds)</th>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Max Requests</th>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.configs.map((config) => (
              <tr key={config.id} className="hover:bg-gray-50">
                <td className="p-3 text-sm font-mono">{config.endpoint_type}</td>
                <td className="p-3 text-sm">{config.window_seconds}</td>
                <td className="p-3 text-sm">{config.max_requests}</td>
                <td className="p-3 text-sm">
                  <button className="text-pup-maroon hover:text-red-900">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSuspiciousIPs = () => (
    <div className="bg-white rounded-brand border border-gray-200">
      <div className="p-4 bg-gray-50/50 border-b border-gray-200">
        <h3 className="font-bold text-gray-900">Suspicious IP Addresses</h3>
      </div>
      <div className="overflow-x-auto">
        {suspiciousIPs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <PhShield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No suspicious activity detected</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">IP Address</th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Risk Level</th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Failed Logins</th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Unique Users</th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suspiciousIPs.map((ip, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-3 text-sm font-mono">{ip.ip}</td>
                  <td className="p-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(ip.riskLevel)}`}>
                      {ip.riskLevel}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{ip.failed_logins}</td>
                  <td className="p-3 text-sm">{ip.unique_users}</td>
                  <td className="p-3 text-sm">{formatTime(ip.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Rate Limiting & Security</h2>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-pup-maroon text-white rounded-brand hover:bg-red-900"
        >
          <PhRefresh className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: PhGauge },
            { id: "configs", label: "Configurations", icon: PhLock },
            { id: "suspicious", label: "Suspicious IPs", icon: PhWarning }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-pup-maroon text-pup-maroon"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pup-maroon"></div>
        </div>
      ) : (
        <>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "configs" && renderConfigurations()}
          {activeTab === "suspicious" && renderSuspiciousIPs()}
        </>
      )}
    </div>
  );
}
