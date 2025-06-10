import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TeamMember } from "@/types";
import { mockTeamMembers } from "@/lib/data";
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const chartConfig = (color: string) => ({
  sales: {
    label: "Sales",
    color: color,
  },
});

export default function TeamTrackingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Team Tracking</h1>
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Sales Team Performance</CardTitle>
          <CardDescription>Individual performance metrics for each sales representative.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Representative</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Visits</TableHead>
                <TableHead className="w-[200px] text-center">Monthly Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTeamMembers.map((member: TeamMember) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">${member.sales.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{member.orders}</TableCell>
                  <TableCell className="text-right">{member.visits}</TableCell>
                  <TableCell className="p-0 h-[60px]">
                    <ChartContainer config={chartConfig('hsl(var(--primary))')} className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={member.performanceData} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                          <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={2} dot={false} />
                          <Tooltip 
                            cursor={{stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3'}}
                            contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                            itemStyle={{color: 'hsl(var(--foreground))'}}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Total Sales</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockTeamMembers.reduce((sum, m) => sum + m.sales, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Total Orders</CardTitle>
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeamMembers.reduce((sum, m) => sum + m.orders, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sales Reps</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTeamMembers.length}</div>
            <p className="text-xs text-muted-foreground">All reps active</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
