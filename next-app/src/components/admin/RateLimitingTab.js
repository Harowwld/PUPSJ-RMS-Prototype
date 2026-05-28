"use client"

import React, { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  PhShield,
  PhWarning,
  PhX,
  PhChartLine,
  PhLock,
  PhUnlock,
  PhGauge,
  PhUsers,
  PhClock,
} from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export default function RateLimitingTab() {
  const [data, setData] = useState({
    recentViolations: [],
    stats: { hits: [], violations: [] },
    configs: [],
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [suspiciousIPs, setSuspiciousIPs] = useState([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [response] = await Promise.all([
        fetch("/api/admin/rate-limits"),
        new Promise((resolve) => setTimeout(resolve, 600)), // Animation visible
      ])
      
      if (!response.ok) throw new Error("Failed to fetch rate limiting data")

      const result = await response.json()
      if (result.ok) {
        setData(result.data)
      }
    } catch (error) {
      toast.error("Failed to load rate limiting data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuspiciousIPs = async () => {
    try {
      const response = await fetch("/api/admin/security/suspicious-ips")
      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          setSuspiciousIPs(result.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch suspicious IPs:", error)
    }
  }

  const clearViolation = async (endpointType, identifier) => {
    try {
      const response = await fetch("/api/admin/rate-limits/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpointType, identifier }),
      })

      if (!response.ok) throw new Error("Failed to clear violation")

      toast.success("Rate limit violation cleared")
      fetchData()
    } catch (error) {
      toast.error("Failed to clear violation")
      console.error(error)
    }
  }

  const updateConfig = async (config) => {
    try {
      const response = await fetch("/api/admin/rate-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) throw new Error("Failed to update configuration")

      toast.success("Rate limit configuration updated")
      fetchData()
    } catch (error) {
      toast.error("Failed to update configuration")
      console.error(error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchSuspiciousIPs()
  }, [])

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleString()
  }

  const getRiskLevelColor = (level) => {
    switch (level) {
      case "HIGH":
        return "text-red-600 bg-red-50 dark:bg-red-950/20"
      case "MEDIUM":
        return "text-orange-600 bg-orange-50"
      case "LOW":
        return "text-yellow-600 bg-yellow-50"
      default:
        return "text-gray-600 dark:text-zinc-300 dark:text-zinc-400 bg-gray-50 dark:bg-card"
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-brand border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-zinc-300">Total Violations (24h)</p>
              <p className="text-2xl font-bold text-pup-maroon dark:text-primary">
                {data.stats.violations.reduce(
                  (sum, v) => sum + parseInt(v.violations || 0),
                  0
                )}
              </p>
            </div>
            <PhShield className="h-8 w-8 text-pup-maroon dark:text-primary" />
          </div>
        </div>

        <div className="rounded-brand border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-zinc-300">API Requests (24h)</p>
              <p className="text-2xl font-bold text-pup-maroon dark:text-primary">
                {data.stats.hits.reduce(
                  (sum, h) => sum + parseInt(h.hits || 0),
                  0
                )}
              </p>
            </div>
            <PhChartLine className="h-8 w-8 text-pup-maroon dark:text-primary" />
          </div>
        </div>

        <div className="rounded-brand border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-zinc-300">Suspicious IPs</p>
              <p className="text-2xl font-bold text-pup-maroon dark:text-primary">
                {suspiciousIPs.length}
              </p>
            </div>
            <PhWarning className="h-8 w-8 text-pup-maroon dark:text-primary" />
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="rounded-brand border border-gray-200 bg-white overflow-hidden dark:border-white/10 dark:bg-card">
        <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <h3 className="font-bold text-gray-900 dark:text-zinc-50">
            Recent Rate Limit Violations
          </h3>
        </div>
        <div className="overflow-x-auto">
          {data.recentViolations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
              <PhShield className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-zinc-600" />
              <p>No recent violations</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-muted">
                <tr>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                    Type
                  </th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                    Identifier
                  </th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                    IP Address
                  </th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                    Violations
                  </th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                    Lockout Until
                  </th>
                  <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                {data.recentViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card">
                    <td className="p-3 text-sm">{violation.endpoint_type}</td>
                    <td className="p-3 font-mono text-sm text-xs">
                      {violation.identifier}
                    </td>
                    <td className="p-3 font-mono text-sm text-xs">
                      {violation.ip_address}
                    </td>
                    <td className="p-3 text-sm">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        {violation.violation_count}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {violation.lockout_until
                        ? formatTime(violation.lockout_until)
                        : "None"}
                    </td>
                    <td className="p-3 text-sm">
                      <button
                        onClick={() =>
                          clearViolation(
                            violation.endpoint_type,
                            violation.identifier
                          )
                        }
                        className="flex items-center gap-1 text-pup-maroon dark:text-primary hover:text-red-900 dark:text-primary"
                      >
                        <PhUnlock className="h-4 w-4" />
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
  )

  const renderConfigurations = () => (
    <div className="rounded-brand border border-gray-200 bg-white overflow-hidden dark:border-white/10 dark:bg-card">
      <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
        <h3 className="font-bold text-gray-900 dark:text-zinc-50">Rate Limit Configurations</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-muted">
            <tr>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                Endpoint Type
              </th>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                Window (seconds)
              </th>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                Max Requests
              </th>
              <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {data.configs.map((config) => (
              <tr key={config.id} className="hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card">
                <td className="p-3 font-mono text-sm">
                  {config.endpoint_type}
                </td>
                <td className="p-3 text-sm">{config.window_seconds}</td>
                <td className="p-3 text-sm">{config.max_requests}</td>
                <td className="p-3 text-sm">
                  <button className="text-pup-maroon dark:text-primary hover:text-red-900 dark:text-primary">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderSuspiciousIPs = () => (
    <div className="rounded-brand border border-gray-200 bg-white overflow-hidden dark:border-white/10 dark:bg-card">
      <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
        <h3 className="font-bold text-gray-900 dark:text-zinc-50">Suspicious IP Addresses</h3>
      </div>
      <div className="overflow-x-auto">
        {suspiciousIPs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
            <PhShield className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-zinc-600" />
            <p>No suspicious activity detected</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-muted">
              <tr>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                  IP Address
                </th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                  Risk Level
                </th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                  Failed Logins
                </th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                  Unique Users
                </th>
                <th className="p-3 text-left text-xs font-bold text-gray-600 uppercase dark:text-zinc-300">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {suspiciousIPs.map((ip, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-white/10 dark:bg-card">
                  <td className="p-3 font-mono text-sm">{ip.ip}</td>
                  <td className="p-3 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getRiskLevelColor(ip.riskLevel)}`}
                    >
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
  )

  return (
    <div className="space-y-6 animate-fade-up font-inter">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-50">
          Rate Limiting & Security
        </h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-white/10">
        <nav className="flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: PhGauge },
            { id: "configs", label: "Configurations", icon: PhLock },
            { id: "suspicious", label: "Suspicious IPs", icon: PhWarning },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium ${ activeTab === tab.id ? "border-gray-300 text-pup-maroon dark:text-primary" : "border-transparent text-gray-500 hover:text-gray-700" } dark:border-white/10 dark:text-primary dark:hover:text-zinc-200`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-brand border border-gray-200 bg-white p-6 h-24 dark:border-white/10 dark:bg-card">
                    <Skeleton className="h-4 w-24 mb-2 dark:bg-muted" />
                    <Skeleton className="h-8 w-16 dark:bg-muted" />
                  </div>
                ))}
              </div>
              <div className="rounded-brand border border-gray-200 bg-white h-64 overflow-hidden dark:border-white/10 dark:bg-card">
                <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                  <Skeleton className="h-5 w-48 dark:bg-muted" />
                </div>
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full dark:bg-muted" />
                  ))}
                </div>
              </div>
            </>
          )}
          {activeTab !== "overview" && (
            <div className="rounded-brand border border-gray-200 bg-white h-96 overflow-hidden dark:border-white/10 dark:bg-card">
              <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                <Skeleton className="h-5 w-48 dark:bg-muted" />
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full dark:bg-muted" />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "configs" && renderConfigurations()}
          {activeTab === "suspicious" && renderSuspiciousIPs()}
        </>
      )}
    </div>
  )
}



