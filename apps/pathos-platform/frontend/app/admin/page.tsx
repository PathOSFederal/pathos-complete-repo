'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Settings, Zap, Network, Database } from 'lucide-react';

export default function AdminPage() {
  const features = [
    { name: 'AI Recommendations', enabled: true, description: 'PathAdvisor AI suggestions' },
    { name: 'Tax Optimizer', enabled: true, description: 'Automated tax optimization' },
    { name: 'Scenario Modeling', enabled: true, description: 'Salary and benefits scenarios' },
    { name: 'Document OCR', enabled: true, description: 'Document text extraction' },
    { name: 'Mobile App Sync', enabled: false, description: 'Sync to mobile application' },
    { name: 'Beta Features', enabled: false, description: 'Early access features' },
  ];

  const integrations = [
    { name: 'Federal Pay System (FPS)', status: 'Connected', lastSync: '2 hours ago', icon: '✓' },
    { name: 'FERS Retirement System', status: 'Connected', lastSync: '1 day ago', icon: '✓' },
    { name: 'TSP Account API', status: 'Connected', lastSync: '6 hours ago', icon: '✓' },
    { name: 'OPM Benefits Database', status: 'Pending', lastSync: '3 days ago', icon: '⚠' },
    { name: 'IRS Tax Data', status: 'Connected', lastSync: 'Today', icon: '✓' },
    { name: 'FEHB Provider API', status: 'Error', lastSync: '1 week ago', icon: '✗' },
  ];

  const models = [
    { name: 'Salary Projection Model', version: 'v2.1', accuracy: '94%', status: 'Active' },
    { name: 'Retirement Calculator', version: 'v1.8', accuracy: '91%', status: 'Active' },
    { name: 'Tax Optimization Engine', version: 'v3.2', accuracy: '97%', status: 'Active' },
    { name: 'Leave Forecasting', version: 'v1.5', accuracy: '88%', status: 'Testing' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Admin & Configuration</h1>
        <p className="text-muted-foreground">Manage features, integrations, and model settings</p>
      </div>

      {/* Feature Flags */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">Feature Flags</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/5 hover:bg-secondary/10 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{feature.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
              </div>
              <Toggle
                pressed={feature.enabled}
                className="ml-4"
                aria-label={`Toggle ${feature.name}`}
              >
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${feature.enabled ? 'bg-accent' : 'bg-secondary/30'}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${feature.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                  />
                </div>
              </Toggle>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">System Integrations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">
                    Integration
                  </th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-3 px-3 text-muted-foreground font-medium">
                    Last Sync
                  </th>
                  <th className="text-right py-3 px-3 text-muted-foreground font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((integration, idx) => {
                  const statusColor =
                    integration.status === 'Connected'
                      ? 'bg-green-500/20 text-green-400'
                      : integration.status === 'Pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-destructive/20 text-destructive';

                  return (
                    <tr
                      key={idx}
                      className="border-b border-border hover:bg-secondary/5 transition-colors"
                    >
                      <td className="py-3 px-3 text-foreground">{integration.name}</td>
                      <td className="py-3 px-3">
                        <Badge className={statusColor}>{integration.status}</Badge>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{integration.lastSync}</td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <Button variant="ghost" size="sm" className="text-xs">
                          Config
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Sync
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Model Configuration */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">Model Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {models.map((model, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-border bg-secondary/5 hover:bg-secondary/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{model.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {model.version}
                      </Badge>
                      <Badge
                        className={
                          model.status === 'Active'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }
                      >
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-accent">{model.accuracy}</p>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs bg-transparent">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs bg-transparent">
                    Test
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs bg-transparent">
                    Logs
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            <CardTitle className="text-lg">System Status</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border border-border bg-secondary/5">
              <p className="text-xs text-muted-foreground mb-1">API Uptime</p>
              <p className="text-2xl font-bold text-green-400">99.98%</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/5">
              <p className="text-xs text-muted-foreground mb-1">Average Response Time</p>
              <p className="text-2xl font-bold text-accent">247ms</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-secondary/5">
              <p className="text-xs text-muted-foreground mb-1">Active Users</p>
              <p className="text-2xl font-bold text-foreground">1,247</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
