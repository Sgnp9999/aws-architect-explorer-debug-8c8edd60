
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Server, Database, Shield, Network, Globe, Layers } from "lucide-react";

interface ResourcePanelProps {
  resource: any;
  onClose: () => void;
}

export const ResourcePanel = ({ resource, onClose }: ResourcePanelProps) => {
  const getIcon = () => {
    switch (resource.type) {
      case 'vpc':
        return <Network className="h-5 w-5" />;
      case 'subnet':
        return <Layers className="h-5 w-5" />;
      case 'ec2':
        return <Server className="h-5 w-5" />;
      case 'rds':
        return <Database className="h-5 w-5" />;
      case 'sg':
        return <Shield className="h-5 w-5" />;
      case 'igw':
        return <Globe className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (resource.type) {
      case 'vpc':
        return 'VPC Details';
      case 'subnet':
        return 'Subnet Details';
      case 'ec2':
        return 'EC2 Instance Details';
      case 'rds':
        return 'RDS Database Details';
      case 'sg':
        return 'Security Group Details';
      case 'igw':
        return 'Internet Gateway Details';
      default:
        return 'Resource Details';
    }
  };

  const renderDetails = () => {
    switch (resource.type) {
      case 'vpc':
        return <VpcDetails vpc={resource} />;
      case 'subnet':
        return <SubnetDetails subnet={resource} />;
      case 'ec2':
        return <Ec2Details ec2={resource} />;
      case 'rds':
        return <RdsDetails rds={resource} />;
      case 'sg':
        return <SecurityGroupDetails sg={resource} />;
      case 'igw':
        return <IgwDetails igw={resource} />;
      default:
        return <div>Unknown resource type</div>;
    }
  };

  return (
    <Card className="w-80 shrink-0 shadow-md border-l-4 border-l-blue-500">
      <CardHeader className="py-3 flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <CardTitle className="text-lg">{getTitle()}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <Separator />
      <ScrollArea className="h-[calc(100vh-13rem)]">
        <CardContent className="pt-4">
          {renderDetails()}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

const VpcDetails = ({ vpc }: { vpc: any }) => (
  <div className="space-y-4">
    <DetailItem label="VPC ID" value={vpc.id} />
    <DetailItem label="Name" value={vpc.name} />
    <DetailItem label="CIDR Block" value={vpc.cidr} />
    <DetailItem label="Is Default" value={vpc.isDefault ? 'Yes' : 'No'} />
    <DetailItem label="State" value={vpc.state} />
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Attached Resources</h4>
      <div className="space-y-1 pl-2">
        <ResourceCount label="Subnets" count={vpc.subnetCount} />
        <ResourceCount label="Instances" count={vpc.instanceCount} />
        <ResourceCount label="Security Groups" count={vpc.sgCount} />
      </div>
    </div>
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Tags</h4>
      <div className="flex flex-wrap gap-1">
        {vpc.tags.map((tag: {key: string, value: string}, i: number) => (
          <Badge key={i} variant="outline" className="text-xs">
            {tag.key}: {tag.value}
          </Badge>
        ))}
      </div>
    </div>
  </div>
);

const SubnetDetails = ({ subnet }: { subnet: any }) => (
  <div className="space-y-4">
    <DetailItem label="Subnet ID" value={subnet.id} />
    <DetailItem label="Name" value={subnet.name} />
    <DetailItem label="CIDR Block" value={subnet.cidr} />
    <DetailItem label="Availability Zone" value={subnet.az} />
    <DetailItem label="VPC ID" value={subnet.vpcId} />
    <DetailItem 
      label="Subnet Type" 
      value={subnet.isPublic ? 'Public' : 'Private'} 
      badge
      badgeColor={subnet.isPublic ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
    />
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Route Table</h4>
      <DetailItem label="Route Table ID" value={subnet.routeTableId} />
      <div className="space-y-1 mt-2">
        {subnet.routes.map((route: any, i: number) => (
          <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <span className="block">Destination: {route.destination}</span>
            <span className="block">Target: {route.target}</span>
          </div>
        ))}
      </div>
    </div>
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Resources</h4>
      <div className="space-y-1 pl-2">
        <ResourceCount label="EC2 Instances" count={subnet.ec2Count} />
        <ResourceCount label="RDS Instances" count={subnet.rdsCount} />
      </div>
    </div>
  </div>
);

const Ec2Details = ({ ec2 }: { ec2: any }) => (
  <div className="space-y-4">
    <DetailItem label="Instance ID" value={ec2.id} />
    <DetailItem label="Name" value={ec2.name} />
    <DetailItem label="Instance Type" value={ec2.instanceType} />
    <DetailItem label="State" value={ec2.state} />
    <DetailItem label="Private IP" value={ec2.privateIp} />
    <DetailItem label="Public IP" value={ec2.publicIp || 'None'} />
    <DetailItem label="VPC ID" value={ec2.vpcId} />
    <DetailItem label="Subnet ID" value={ec2.subnetId} />
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Security Groups</h4>
      <div className="space-y-1">
        {ec2.securityGroups.map((sg: any, i: number) => (
          <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <span className="font-medium">{sg.groupName}</span>
            <span className="block text-gray-500 dark:text-gray-400">{sg.groupId}</span>
          </div>
        ))}
      </div>
    </div>
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Connectivity Status</h4>
      <div className="space-y-2">
        {ec2.connectivity.map((conn: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded ${conn.status === 'allowed' ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
            <span className="block font-medium">To: {conn.target} ({conn.targetId})</span>
            <span className="block">{conn.description}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const RdsDetails = ({ rds }: { rds: any }) => (
  <div className="space-y-4">
    <DetailItem label="RDS ID" value={rds.id} />
    <DetailItem label="Database Name" value={rds.dbName} />
    <DetailItem label="Engine" value={rds.engine} />
    <DetailItem label="Engine Version" value={rds.engineVersion} />
    <DetailItem label="Status" value={rds.status} />
    <DetailItem label="Endpoint" value={rds.endpoint} />
    <DetailItem label="Port" value={rds.port.toString()} />
    <DetailItem label="VPC ID" value={rds.vpcId} />
    <DetailItem label="Subnet Group" value={rds.subnetGroup} />
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Security Groups</h4>
      <div className="space-y-1">
        {rds.securityGroups.map((sg: any, i: number) => (
          <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <span className="font-medium">{sg.groupName}</span>
            <span className="block text-gray-500 dark:text-gray-400">{sg.groupId}</span>
          </div>
        ))}
      </div>
    </div>
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Connectivity Status</h4>
      <div className="space-y-2">
        {rds.connectivity.map((conn: any, i: number) => (
          <div key={i} className={`text-xs p-2 rounded ${conn.status === 'allowed' ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
            <span className="block font-medium">From: {conn.source} ({conn.sourceId})</span>
            <span className="block">{conn.description}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SecurityGroupDetails = ({ sg }: { sg: any }) => (
  <div className="space-y-4">
    <DetailItem label="Security Group ID" value={sg.id} />
    <DetailItem label="Name" value={sg.name} />
    <DetailItem label="Description" value={sg.description} />
    <DetailItem label="VPC ID" value={sg.vpcId} />
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Inbound Rules</h4>
      <div className="space-y-1">
        {sg.inboundRules.map((rule: any, i: number) => (
          <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <span className="block">Protocol: {rule.protocol}</span>
            <span className="block">Port Range: {rule.portRange}</span>
            <span className="block">Source: {rule.source}</span>
            <span className="block text-gray-500 dark:text-gray-400">{rule.description}</span>
          </div>
        ))}
      </div>
    </div>
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Outbound Rules</h4>
      <div className="space-y-1">
        {sg.outboundRules.map((rule: any, i: number) => (
          <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <span className="block">Protocol: {rule.protocol}</span>
            <span className="block">Port Range: {rule.portRange}</span>
            <span className="block">Destination: {rule.destination}</span>
            <span className="block text-gray-500 dark:text-gray-400">{rule.description}</span>
          </div>
        ))}
      </div>
    </div>
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Associated Resources</h4>
      <div className="space-y-1 pl-2">
        <ResourceCount label="EC2 Instances" count={sg.ec2Count} />
        <ResourceCount label="RDS Instances" count={sg.rdsCount} />
      </div>
    </div>
  </div>
);

const IgwDetails = ({ igw }: { igw: any }) => (
  <div className="space-y-4">
    <DetailItem label="Internet Gateway ID" value={igw.id} />
    <DetailItem label="Name" value={igw.name} />
    <DetailItem label="State" value={igw.state} />
    <DetailItem label="VPC ID" value={igw.vpcId} />
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Attached VPC</h4>
      <DetailItem label="VPC Name" value={igw.vpcName} />
      <DetailItem label="VPC CIDR" value={igw.vpcCidr} />
    </div>
    
    <div className="pt-2">
      <h4 className="text-sm font-medium mb-2">Route Tables</h4>
      <div className="space-y-1">
        {igw.routeTables.map((rt: any, i: number) => (
          <div key={i} className="text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
            <span className="block font-medium">{rt.routeTableId}</span>
            <span className="block">Associated Subnets: {rt.subnetCount}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const DetailItem = ({ 
  label, 
  value, 
  badge = false,
  badgeColor = ""
}: { 
  label: string; 
  value: string;
  badge?: boolean;
  badgeColor?: string;
}) => (
  <div className="flex items-start">
    <span className="text-xs text-gray-500 dark:text-gray-400 w-1/3">{label}:</span>
    {badge ? (
      <Badge className={`text-xs ml-2 ${badgeColor}`}>{value}</Badge>
    ) : (
      <span className="text-xs font-medium ml-2 truncate">{value}</span>
    )}
  </div>
);

const ResourceCount = ({ label, count }: { label: string; count: number }) => (
  <div className="flex items-center text-xs">
    <span className="text-gray-500 dark:text-gray-400">{label}:</span>
    <Badge variant="secondary" className="ml-2 text-xs">{count}</Badge>
  </div>
);
