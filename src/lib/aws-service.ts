
import { 
  EC2Client, 
  DescribeVpcsCommand, 
  DescribeSubnetsCommand,
  DescribeInstancesCommand,
  DescribeSecurityGroupsCommand,
  DescribeInternetGatewaysCommand,
  DescribeRouteTablesCommand
} from "@aws-sdk/client-ec2";
import { 
  RDSClient, 
  DescribeDBInstancesCommand 
} from "@aws-sdk/client-rds";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";

// AWS service class to handle authentication and API calls
export class AwsService {
  private ec2Client: EC2Client;
  private rdsClient: RDSClient;
  
  constructor(credentials: {
    accessKey: string;
    secretKey: string;
    region: string;
  }) {
    const config = {
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKey,
        secretAccessKey: credentials.secretKey
      }
    };
    
    this.ec2Client = new EC2Client(config);
    this.rdsClient = new RDSClient(config);
  }
  
  // Fetch all VPC data
  async fetchVpcs() {
    try {
      const command = new DescribeVpcsCommand({});
      const response = await this.ec2Client.send(command);
      return response.Vpcs || [];
    } catch (error) {
      console.error("Error fetching VPCs:", error);
      throw error;
    }
  }
  
  // Fetch all subnet data
  async fetchSubnets() {
    try {
      const command = new DescribeSubnetsCommand({});
      const response = await this.ec2Client.send(command);
      return response.Subnets || [];
    } catch (error) {
      console.error("Error fetching subnets:", error);
      throw error;
    }
  }
  
  // Fetch EC2 instances
  async fetchEC2Instances() {
    try {
      const command = new DescribeInstancesCommand({});
      const response = await this.ec2Client.send(command);
      const instances = response.Reservations?.flatMap(reservation => 
        reservation.Instances || []
      ) || [];
      return instances;
    } catch (error) {
      console.error("Error fetching EC2 instances:", error);
      throw error;
    }
  }
  
  // Fetch RDS instances
  async fetchRDSInstances() {
    try {
      const command = new DescribeDBInstancesCommand({});
      const response = await this.rdsClient.send(command);
      return response.DBInstances || [];
    } catch (error) {
      console.error("Error fetching RDS instances:", error);
      throw error;
    }
  }
  
  // Fetch security groups
  async fetchSecurityGroups() {
    try {
      const command = new DescribeSecurityGroupsCommand({});
      const response = await this.ec2Client.send(command);
      return response.SecurityGroups || [];
    } catch (error) {
      console.error("Error fetching security groups:", error);
      throw error;
    }
  }
  
  // Fetch Internet Gateways
  async fetchInternetGateways() {
    try {
      const command = new DescribeInternetGatewaysCommand({});
      const response = await this.ec2Client.send(command);
      return response.InternetGateways || [];
    } catch (error) {
      console.error("Error fetching internet gateways:", error);
      throw error;
    }
  }
  
  // Fetch Route Tables
  async fetchRouteTables() {
    try {
      const command = new DescribeRouteTablesCommand({});
      const response = await this.ec2Client.send(command);
      return response.RouteTables || [];
    } catch (error) {
      console.error("Error fetching route tables:", error);
      throw error;
    }
  }
  
  // Fetch all AWS architecture data
  async fetchAwsArchitecture() {
    try {
      // Fetch all resources in parallel for better performance
      const [vpcs, subnets, ec2Instances, rdsInstances, securityGroups, internetGateways, routeTables] = await Promise.all([
        this.fetchVpcs(),
        this.fetchSubnets(),
        this.fetchEC2Instances(),
        this.fetchRDSInstances(),
        this.fetchSecurityGroups(),
        this.fetchInternetGateways(),
        this.fetchRouteTables()
      ]);
      
      // Transform raw AWS data into the format our application expects
      return this.transformAwsData(vpcs, subnets, ec2Instances, rdsInstances, securityGroups, internetGateways, routeTables);
    } catch (error) {
      console.error("Error fetching AWS architecture:", error);
      throw error;
    }
  }
  
  // Transform raw AWS data into the format expected by our application
  private transformAwsData(vpcs: any[], subnets: any[], ec2Instances: any[], rdsInstances: any[], securityGroups: any[], internetGateways: any[], routeTables: any[]) {
    // Process VPCs
    const processedVpcs = vpcs.map(vpc => {
      // Find subnets belonging to this VPC
      const vpcSubnets = subnets.filter(subnet => subnet.VpcId === vpc.VpcId);
      
      // Find internet gateway for this VPC
      const igw = internetGateways.find(igw => 
        igw.Attachments?.some(attachment => attachment.VpcId === vpc.VpcId)
      );
      
      // Find route tables for this VPC
      const vpcRouteTables = routeTables.filter(rt => rt.VpcId === vpc.VpcId);
      
      // Process subnets
      const processedSubnets = vpcSubnets.map(subnet => {
        // Determine if subnet is public by checking route tables
        const routeTable = vpcRouteTables.find(rt => 
          rt.Associations?.some(assoc => assoc.SubnetId === subnet.SubnetId)
        );
        
        const isPublic = routeTable?.Routes?.some(route => 
          route.GatewayId?.startsWith('igw-')
        ) || false;
        
        // Count EC2 instances in this subnet
        const ec2Count = ec2Instances.filter(instance => 
          instance.SubnetId === subnet.SubnetId
        ).length;
        
        // Count RDS instances in this subnet
        const rdsCount = rdsInstances.filter(db => 
          db.DBSubnetGroup?.Subnets?.some(dbSubnet => 
            dbSubnet.SubnetIdentifier === subnet.SubnetId
          )
        ).length;
        
        return {
          id: subnet.SubnetId,
          name: subnet.Tags?.find(tag => tag.Key === 'Name')?.Value || subnet.SubnetId,
          cidr: subnet.CidrBlock,
          az: subnet.AvailabilityZone,
          vpcId: subnet.VpcId,
          isPublic,
          routeTableId: routeTable?.RouteTableId,
          ec2Count,
          rdsCount,
          routes: routeTable?.Routes?.map(route => ({
            destination: route.DestinationCidrBlock || 'unknown',
            target: route.GatewayId || route.InstanceId || route.NatGatewayId || 'local'
          })) || []
        };
      });
      
      // Process internet gateway
      const processedIgw = igw ? {
        id: igw.InternetGatewayId,
        name: igw.Tags?.find(tag => tag.Key === 'Name')?.Value || igw.InternetGatewayId,
        state: igw.Attachments?.[0]?.State || 'detached',
        vpcId: vpc.VpcId,
        vpcName: vpc.Tags?.find(tag => tag.Key === 'Name')?.Value || vpc.VpcId,
        vpcCidr: vpc.CidrBlock,
        routeTables: vpcRouteTables
          .filter(rt => rt.Routes?.some(route => route.GatewayId === igw.InternetGatewayId))
          .map(rt => ({ routeTableId: rt.RouteTableId, subnetCount: rt.Associations?.length || 0 }))
      } : null;
      
      return {
        id: vpc.VpcId,
        name: vpc.Tags?.find(tag => tag.Key === 'Name')?.Value || vpc.VpcId,
        cidr: vpc.CidrBlock,
        state: vpc.State,
        isDefault: vpc.IsDefault,
        subnetCount: vpcSubnets.length,
        instanceCount: ec2Instances.filter(instance => instance.VpcId === vpc.VpcId).length,
        sgCount: securityGroups.filter(sg => sg.VpcId === vpc.VpcId).length,
        tags: vpc.Tags?.map(tag => ({ key: tag.Key, value: tag.Value })) || [],
        internetGateway: processedIgw,
        subnets: processedSubnets
      };
    });
    
    // Process EC2 instances
    const processedEC2 = ec2Instances.map(instance => {
      // Find security groups for this instance
      const instanceSGs = instance.SecurityGroups?.map(sg => {
        const fullSG = securityGroups.find(fullSg => fullSg.GroupId === sg.GroupId);
        return {
          groupId: sg.GroupId,
          groupName: sg.GroupName,
          description: fullSG?.Description
        };
      }) || [];
      
      return {
        id: instance.InstanceId,
        name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || instance.InstanceId,
        instanceType: instance.InstanceType,
        state: instance.State?.Name,
        privateIp: instance.PrivateIpAddress,
        publicIp: instance.PublicIpAddress,
        vpcId: instance.VpcId,
        subnetId: instance.SubnetId,
        securityGroups: instanceSGs,
        type: 'ec2'
      };
    });
    
    // Process RDS instances
    const processedRDS = rdsInstances.map(db => {
      // Find security groups for this RDS instance
      const dbSGs = db.VpcSecurityGroups?.map(sg => {
        const fullSG = securityGroups.find(fullSg => fullSg.GroupId === sg.VpcSecurityGroupId);
        return {
          groupId: sg.VpcSecurityGroupId,
          groupName: fullSG?.GroupName,
          description: fullSG?.Description
        };
      }) || [];
      
      return {
        id: db.DBInstanceIdentifier,
        dbName: db.DBName,
        engine: db.Engine,
        engineVersion: db.EngineVersion,
        status: db.DBInstanceStatus,
        endpoint: db.Endpoint?.Address,
        port: db.Endpoint?.Port,
        vpcId: db.DBSubnetGroup?.VpcId,
        subnetGroup: db.DBSubnetGroup?.Subnets?.map(subnet => subnet.SubnetIdentifier).join(','),
        securityGroups: dbSGs,
        type: 'rds'
      };
    });
    
    // Process security groups
    const processedSGs = securityGroups.map(sg => {
      // Count resources using this security group
      const ec2Count = ec2Instances.filter(instance => 
        instance.SecurityGroups?.some(instanceSG => instanceSG.GroupId === sg.GroupId)
      ).length;
      
      const rdsCount = rdsInstances.filter(db => 
        db.VpcSecurityGroups?.some(dbSG => dbSG.VpcSecurityGroupId === sg.GroupId)
      ).length;
      
      return {
        id: sg.GroupId,
        name: sg.GroupName,
        description: sg.Description,
        vpcId: sg.VpcId,
        inboundRules: sg.IpPermissions?.map(perm => ({
          protocol: perm.IpProtocol,
          portRange: perm.FromPort === perm.ToPort ? 
            perm.FromPort?.toString() : 
            `${perm.FromPort}-${perm.ToPort}`,
          source: perm.UserIdGroupPairs?.length ? 
            perm.UserIdGroupPairs[0].GroupId : 
            perm.IpRanges?.[0]?.CidrIp || 'unknown',
          description: perm.IpRanges?.[0]?.Description || ''
        })) || [],
        outboundRules: sg.IpPermissionsEgress?.map(perm => ({
          protocol: perm.IpProtocol,
          portRange: perm.IpProtocol === '-1' ? 
            'All' : 
            (perm.FromPort === perm.ToPort ? 
              perm.FromPort?.toString() : 
              `${perm.FromPort}-${perm.ToPort}`),
          destination: perm.UserIdGroupPairs?.length ? 
            perm.UserIdGroupPairs[0].GroupId : 
            perm.IpRanges?.[0]?.CidrIp || 'unknown',
          description: perm.IpRanges?.[0]?.Description || ''
        })) || [],
        ec2Count,
        rdsCount,
        type: 'sg'
      };
    });
    
    // Analyze connectivity between EC2 and RDS instances based on security groups
    const connections = [];
    
    // For each EC2 instance, check if it can connect to each RDS instance
    processedEC2.forEach(ec2 => {
      processedRDS.forEach(rds => {
        // Get security groups for both resources
        const ec2SGIds = ec2.securityGroups.map(sg => sg.groupId);
        const rdsSGIds = rds.securityGroups.map(sg => sg.groupId);
        
        // Check if RDS security groups allow inbound from EC2 security groups
        let connectionAllowed = false;
        let errorMessage = null;
        
        // Find the security group objects
        const rdsSGs = rdsSGIds.map(sgId => processedSGs.find(sg => sg.id === sgId)).filter(Boolean);
        
        // Check inbound rules on RDS security groups
        for (const rdsSG of rdsSGs) {
          for (const inboundRule of rdsSG.inboundRules) {
            // Check if rule allows traffic from EC2 security groups
            if (ec2SGIds.includes(inboundRule.source)) {
              connectionAllowed = true;
              break;
            }
          }
          if (connectionAllowed) break;
        }
        
        if (!connectionAllowed) {
          errorMessage = `Security group rules don't allow connection from EC2 (${ec2.id}) to RDS (${rds.id})`;
        }
        
        connections.push({
          sourceId: ec2.id,
          targetId: rds.id,
          status: connectionAllowed ? 'allowed' : 'blocked',
          errorMessage
        });
      });
    });
    
    return {
      vpcs: processedVpcs,
      ec2Instances: processedEC2,
      rdsInstances: processedRDS,
      securityGroups: processedSGs,
      connections
    };
  }
}
