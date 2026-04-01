import { useGetDashboardSummary, useGetPipelineSummary, useGetRecentActivity, useHealthCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, Briefcase, Building2, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: pipeline, isLoading: isLoadingPipeline } = useGetPipelineSummary();
  const { data: recentActivity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 10 });
  const { data: health } = useHealthCheck();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Cross-domain visibility and operational health.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${health ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'} text-sm font-medium`}>
              {health ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {health ? 'System Operational' : 'System Offline'}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Opportunities"
          value={summary?.totalOpportunities}
          icon={Briefcase}
          loading={isLoadingSummary}
        />
        <MetricCard
          title="Pipeline Value"
          value={summary?.totalPipelineValue ? `$${summary.totalPipelineValue.toLocaleString()}` : undefined}
          icon={TrendingUp}
          loading={isLoadingSummary}
          valueClass="text-primary"
        />
        <MetricCard
          title="Total Companies"
          value={summary?.totalCompanies}
          icon={Building2}
          loading={isLoadingSummary}
        />
        <MetricCard
          title="Total Contacts"
          value={summary?.totalContacts}
          icon={Users}
          loading={isLoadingSummary}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Revenue Projection</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
               <Skeleton className="h-[300px] w-full bg-muted/20" />
            ) : summary?.revenueByMonth ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                    <RechartsTooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto max-h-[400px] pr-2 space-y-4">
             {isLoadingActivity ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full bg-muted/20" />)
             ) : recentActivity?.length ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))
             ) : (
                <div className="text-sm text-muted-foreground">No recent activity</div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, loading, valueClass = "" }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 bg-muted/20" />
        ) : (
          <div className={`text-2xl font-bold ${valueClass}`}>{value !== undefined ? value : '-'}</div>
        )}
      </CardContent>
    </Card>
  );
}