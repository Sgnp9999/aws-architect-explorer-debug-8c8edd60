import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar, SidebarContent, SidebarHeader, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Search, Download, LogOut, Moon, Sun, Filter, Network, Database, Shield, Cpu, Layers, Server, Cloud, Globe, HelpCircle, Info, User } from "lucide-react";
import { ResourcePanel } from "@/components/ResourcePanel";
import { mockAwsData } from "@/lib/mock-aws-data";
import { ResourceMap } from "@/components/ResourceMap";
import { AwsService } from "@/lib/aws-service";
import { useToast } from "@/hooks/use-toast";

interface ArchitectureViewProps {
  credentials: {
    accessKey: string;
    secretKey: string;
    region: string;
  };
}

export const ArchitectureView = ({ credentials }: ArchitectureViewProps) => {
  const [loading, setLoading] = useState(true);
  const [awsData, setAwsData] = useState<any>(null);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [visibleResources, setVisibleResources] = useState<string[]>([
    "vpc", "subnet", "igw", "ec2", "rds", "sg"
  ]);
  const [error, setError] = useState<string | null>(null);
  const awsService = useRef<AwsService | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchAwsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        awsService.current = new AwsService(credentials);
        
        const data = await awsService.current.fetchAwsArchitecture();
        setAwsData(data);
        
        toast({
          title: "AWS Architecture Loaded",
          description: `Successfully loaded ${data.vpcs.length} VPCs, ${data.ec2Instances.length} EC2 instances, and ${data.rdsInstances.length} RDS instances.`,
          variant: "default",
        });
      } catch (error) {
        console.error("Error fetching AWS data:", error);
        setError("Failed to fetch AWS data. Please check your credentials and try again.");
        
        toast({
          title: "Error Loading AWS Architecture",
          description: "Failed to fetch data. Please check your credentials and try again.",
          variant: "destructive",
        });
        
        setAwsData(mockAwsData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAwsData();
  }, [credentials, toast]);
  
  const handleResourceClick = (resource: any) => {
    setSelectedResource(resource);
  };
  
  const handleRefresh = async () => {
    if (!awsService.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await awsService.current.fetchAwsArchitecture();
      setAwsData(data);
      
      toast({
        title: "AWS Architecture Refreshed",
        description: "Successfully refreshed your AWS architecture data.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error refreshing AWS data:", error);
      setError("Failed to refresh AWS data.");
      
      toast({
        title: "Error Refreshing Data",
        description: "Failed to refresh AWS architecture data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const toggleResourceVisibility = (resourceType: string) => {
    if (visibleResources.includes(resourceType)) {
      setVisibleResources(visibleResources.filter(r => r !== resourceType));
    } else {
      setVisibleResources([...visibleResources, resourceType]);
    }
  };
  
  const handleDownload = () => {
    if (!awsData) return;
    
    const dataStr = JSON.stringify(awsData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', dataUri);
    downloadLink.setAttribute('download', `aws-architecture-${credentials.region}.json`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    toast({
      title: "Architecture Data Downloaded",
      description: "AWS architecture data has been downloaded as JSON.",
      variant: "default",
    });
  };
  
  const handleLogout = () => {
    window.location.reload();
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };
  
  const filterResourcesBySearch = (resources: any) => {
    if (!searchQuery) return resources;
    
    const query = searchQuery.toLowerCase();
    return {
      ...resources,
      vpcs: resources.vpcs.filter((vpc: any) => 
        vpc.id.toLowerCase().includes(query) || 
        (vpc.name && vpc.name.toLowerCase().includes(query))
      ),
      ec2Instances: resources.ec2Instances.filter((ec2: any) =>
        ec2.id.toLowerCase().includes(query) ||
        (ec2.name && ec2.name.toLowerCase().includes(query))
      ),
      rdsInstances: resources.rdsInstances.filter((rds: any) =>
        rds.id.toLowerCase().includes(query) ||
        (rds.name && rds.name.toLowerCase().includes(query))
      ),
      securityGroups: resources.securityGroups.filter((sg: any) =>
        sg.id.toLowerCase().includes(query) ||
        (sg.name && sg.name.toLowerCase().includes(query))
      ),
    };
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <InfoSidebar 
            visibleResources={visibleResources} 
            toggleResourceVisibility={toggleResourceVisibility}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
          />
          
          <div className="flex-1 flex flex-col">
            <Header 
              region={credentials.region} 
              onRefresh={handleRefresh} 
              onDownload={handleDownload}
              onLogout={handleLogout}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
            
            <main className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-lg">Loading AWS architecture...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-6 rounded-lg max-w-lg text-center">
                    <Info className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-semibold mb-2">Error Loading AWS Architecture</h3>
                    <p>{error}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full space-x-4">
                  <div className="flex-1 relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {awsData && (
                      <ResourceMap 
                        data={filterResourcesBySearch(awsData)} 
                        onResourceClick={handleResourceClick}
                        visibleResources={visibleResources}
                      />
                    )}
                  </div>
                  
                  {selectedResource && (
                    <ResourcePanel 
                      resource={selectedResource}
                      onClose={() => setSelectedResource(null)}
                    />
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

const Header = ({ 
  region, 
  onRefresh, 
  onDownload, 
  onLogout,
  searchQuery,
  setSearchQuery
}: {
  region: string;
  onRefresh: () => void;
  onDownload: () => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <SidebarTrigger />
        <h1 className="text-xl font-bold ml-2">AWS Architecture Explorer</h1>
        <Badge variant="outline" className="ml-4">
          Region: {region}
        </Badge>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search resources..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh architecture</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download diagram</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
};

const InfoSidebar = ({ 
  visibleResources, 
  toggleResourceVisibility,
  darkMode,
  toggleDarkMode
}: {
  visibleResources: string[];
  toggleResourceVisibility: (resourceType: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}) => {
  return (
    <Sidebar className="border-r border-gray-200 dark:border-gray-700">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <Cloud className="h-6 w-6 text-blue-500" />
          <div className="flex items-center space-x-1">
            <Sun className="h-4 w-4" />
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            <Moon className="h-4 w-4" />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Visible Resources</h3>
            <div className="space-y-2">
              {[
                { id: 'vpc', label: 'VPC', icon: Network },
                { id: 'subnet', label: 'Subnets', icon: Layers },
                { id: 'sg', label: 'Security Groups', icon: Shield },
                { id: 'igw', label: 'Internet Gateways', icon: Globe },
                { id: 'ec2', label: 'EC2 Instances', icon: Server },
                { id: 'rds', label: 'RDS Databases', icon: Database }
              ].map((resource) => (
                <div key={resource.id} className="flex items-center">
                  <Switch
                    id={`toggle-${resource.id}`}
                    checked={visibleResources.includes(resource.id)}
                    onCheckedChange={() => toggleResourceVisibility(resource.id)}
                  />
                  <Label htmlFor={`toggle-${resource.id}`} className="ml-2 flex items-center cursor-pointer">
                    <resource.icon className="h-4 w-4 mr-1" />
                    {resource.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-sm font-medium mb-2">Connection Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-6 h-1 bg-green-500 mr-2 rounded-full"></div>
                <span className="text-sm">Allowed Connection</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-1 bg-red-500 mr-2 rounded-full border-dashed border-2"></div>
                <span className="text-sm">Blocked Connection</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center">
                <HelpCircle className="h-4 w-4 mr-1" />
                Help & Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <p>• Click on any resource to view details</p>
              <p>• Hover over red connections to see connectivity issues</p>
              <p>• Use the search to find specific resources</p>
              <p>• Toggle resource visibility using the switches above</p>
            </CardContent>
          </Card>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};
