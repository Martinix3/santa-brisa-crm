"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Order, OrderStatus } from "@/types";
import { mockOrders } from "@/lib/data";
import { MoreHorizontal, Eye, Edit, Trash2, Filter, CalendarDays, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parseISO } from "date-fns";

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Delivered': return 'default'; // Using primary for success
    case 'Confirmed':
    case 'Shipped': return 'secondary';
    case 'Pending':
    case 'Processing': return 'outline'; // Yellowish, using 'accent' class directly
    case 'Cancelled':
    case 'Failed': return 'destructive';
    default: return 'outline';
  }
};

const getStatusBadgeColor = (status: OrderStatus): string => {
  switch (status) {
    case 'Delivered': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Confirmed': return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'Shipped': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Pending': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Processing': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Cancelled':
    case 'Failed': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
}


export default function OrdersDashboardPage() {
  const [orders, setOrders] = React.useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "All">("All");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const uniqueStatuses = ["All", ...Array.from(new Set(mockOrders.map(order => order.status)))] as (OrderStatus | "All")[];

  const filteredOrders = orders
    .filter(order => 
      (order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.salesRep.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(order => statusFilter === "All" || order.status === statusFilter)
    .filter(order => {
      if (!dateRange?.from) return true;
      const orderDate = parseISO(order.visitDate);
      const fromDate = dateRange.from;
      const toDate = dateRange.to ? addDays(dateRange.to,1) : addDays(new Date(), 1) ; // include the whole 'to' day
      return orderDate >= fromDate && orderDate < toDate;
    });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Orders Dashboard</h1>
      
      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Manage Orders</CardTitle>
          <CardDescription>View, filter, and manage all registered client orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input 
              placeholder="Search orders (ID, Client, Rep)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" /> 
                  Status: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {uniqueStatuses.map(status => (
                   <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter === status}
                    onCheckedChange={() => setStatusFilter(status)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>{format(parseISO(order.visitDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{order.salesRep}</TableCell>
                    <TableCell className="text-right">${order.value.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-xs", getStatusBadgeColor(order.status))}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                          <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Edit Order</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No orders found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
