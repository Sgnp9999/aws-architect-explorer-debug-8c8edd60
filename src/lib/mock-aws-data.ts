
export const mockAwsData = {
  vpcs: [
    {
      id: 'vpc-12345',
      name: 'Main VPC',
      cidr: '10.0.0.0/16',
      state: 'available',
      isDefault: false,
      subnetCount: 4,
      instanceCount: 3,
      sgCount: 5,
      tags: [
        { key: 'Name', value: 'Main VPC' },
        { key: 'Environment', value: 'Production' },
      ],
      internetGateway: {
        id: 'igw-12345',
        name: 'Main IGW',
        state: 'attached',
        vpcId: 'vpc-12345',
        vpcName: 'Main VPC',
        vpcCidr: '10.0.0.0/16',
        routeTables: [
          { routeTableId: 'rtb-12345', subnetCount: 2 },
        ]
      },
      subnets: [
        {
          id: 'subnet-public1',
          name: 'Public Subnet 1',
          cidr: '10.0.1.0/24',
          az: 'us-east-1a',
          vpcId: 'vpc-12345',
          isPublic: true,
          routeTableId: 'rtb-12345',
          nacl: 'acl-12345',
          ec2Count: 2,
          rdsCount: 0,
          routes: [
            { destination: '10.0.0.0/16', target: 'local' },
            { destination: '0.0.0.0/0', target: 'igw-12345' }
          ]
        },
        {
          id: 'subnet-public2',
          name: 'Public Subnet 2',
          cidr: '10.0.2.0/24',
          az: 'us-east-1b',
          vpcId: 'vpc-12345',
          isPublic: true,
          routeTableId: 'rtb-12345',
          nacl: 'acl-12345',
          ec2Count: 1,
          rdsCount: 0,
          routes: [
            { destination: '10.0.0.0/16', target: 'local' },
            { destination: '0.0.0.0/0', target: 'igw-12345' }
          ]
        },
        {
          id: 'subnet-private1',
          name: 'Private Subnet 1',
          cidr: '10.0.3.0/24',
          az: 'us-east-1a',
          vpcId: 'vpc-12345',
          isPublic: false,
          routeTableId: 'rtb-67890',
          nacl: 'acl-67890',
          ec2Count: 0,
          rdsCount: 1,
          routes: [
            { destination: '10.0.0.0/16', target: 'local' }
          ]
        },
        {
          id: 'subnet-private2',
          name: 'Private Subnet 2',
          cidr: '10.0.4.0/24',
          az: 'us-east-1b',
          vpcId: 'vpc-12345',
          isPublic: false,
          routeTableId: 'rtb-67890',
          nacl: 'acl-67890',
          ec2Count: 0,
          rdsCount: 1,
          routes: [
            { destination: '10.0.0.0/16', target: 'local' }
          ]
        }
      ]
    }
  ],
  ec2Instances: [
    {
      id: 'i-12345',
      name: 'Web Server 1',
      instanceType: 't3.micro',
      state: 'running',
      privateIp: '10.0.1.10',
      publicIp: '54.123.45.67',
      vpcId: 'vpc-12345',
      subnetId: 'subnet-public1',
      securityGroups: [
        { groupId: 'sg-webserver', groupName: 'WebServer-SG' }
      ],
      type: 'ec2',
      connectivity: [
        {
          target: 'RDS Database',
          targetId: 'db-12345',
          status: 'allowed',
          description: 'Connection allowed on port 3306'
        },
        {
          target: 'Analytics DB',
          targetId: 'db-67890',
          status: 'blocked',
          description: 'Connection blocked: SG rule missing',
          errorMessage: 'Security group sg-analytics does not allow inbound traffic from sg-webserver on port 5432'
        }
      ]
    },
    {
      id: 'i-23456',
      name: 'API Server',
      instanceType: 't3.small',
      state: 'running',
      privateIp: '10.0.1.11',
      publicIp: '54.123.45.68',
      vpcId: 'vpc-12345',
      subnetId: 'subnet-public1',
      securityGroups: [
        { groupId: 'sg-apiserver', groupName: 'APIServer-SG' }
      ],
      type: 'ec2',
      connectivity: [
        {
          target: 'RDS Database',
          targetId: 'db-12345',
          status: 'allowed',
          description: 'Connection allowed on port 3306'
        }
      ]
    },
    {
      id: 'i-34567',
      name: 'Management Server',
      instanceType: 't3.medium',
      state: 'running',
      privateIp: '10.0.2.10',
      publicIp: '54.123.45.69',
      vpcId: 'vpc-12345',
      subnetId: 'subnet-public2',
      securityGroups: [
        { groupId: 'sg-management', groupName: 'Management-SG' }
      ],
      type: 'ec2',
      connectivity: [
        {
          target: 'RDS Database',
          targetId: 'db-12345',
          status: 'allowed',
          description: 'Connection allowed on port 3306'
        },
        {
          target: 'Analytics DB',
          targetId: 'db-67890',
          status: 'allowed',
          description: 'Connection allowed on port 5432'
        }
      ]
    }
  ],
  rdsInstances: [
    {
      id: 'db-12345',
      dbName: 'Main Database',
      engine: 'mysql',
      engineVersion: '8.0.23',
      status: 'available',
      endpoint: 'db-12345.abcdefg.us-east-1.rds.amazonaws.com',
      port: 3306,
      vpcId: 'vpc-12345',
      subnetGroup: 'subnet-private1,subnet-private2',
      securityGroups: [
        { groupId: 'sg-database', groupName: 'Database-SG' }
      ],
      type: 'rds',
      connectivity: [
        {
          source: 'Web Server 1',
          sourceId: 'i-12345',
          status: 'allowed',
          description: 'Inbound allowed from sg-webserver on port 3306'
        },
        {
          source: 'API Server',
          sourceId: 'i-23456',
          status: 'allowed',
          description: 'Inbound allowed from sg-apiserver on port 3306'
        },
        {
          source: 'Management Server',
          sourceId: 'i-34567',
          status: 'allowed',
          description: 'Inbound allowed from sg-management on port 3306'
        }
      ]
    },
    {
      id: 'db-67890',
      dbName: 'Analytics Database',
      engine: 'postgres',
      engineVersion: '13.2',
      status: 'available',
      endpoint: 'db-67890.zyxwvu.us-east-1.rds.amazonaws.com',
      port: 5432,
      vpcId: 'vpc-12345',
      subnetGroup: 'subnet-private1,subnet-private2',
      securityGroups: [
        { groupId: 'sg-analytics', groupName: 'Analytics-SG' }
      ],
      type: 'rds',
      connectivity: [
        {
          source: 'Web Server 1',
          sourceId: 'i-12345',
          status: 'blocked',
          description: 'Inbound blocked from sg-webserver on port 5432',
          errorMessage: 'sg-analytics does not allow inbound traffic from sg-webserver on port 5432'
        },
        {
          source: 'Management Server',
          sourceId: 'i-34567',
          status: 'allowed',
          description: 'Inbound allowed from sg-management on port 5432'
        }
      ]
    }
  ],
  securityGroups: [
    {
      id: 'sg-webserver',
      name: 'WebServer-SG',
      description: 'Security group for web servers',
      vpcId: 'vpc-12345',
      inboundRules: [
        {
          protocol: 'tcp',
          portRange: '80',
          source: '0.0.0.0/0',
          description: 'Allow HTTP from anywhere'
        },
        {
          protocol: 'tcp',
          portRange: '443',
          source: '0.0.0.0/0',
          description: 'Allow HTTPS from anywhere'
        },
        {
          protocol: 'tcp',
          portRange: '22',
          source: '10.0.0.0/16',
          description: 'Allow SSH from VPC'
        }
      ],
      outboundRules: [
        {
          protocol: 'tcp',
          portRange: '3306',
          destination: 'sg-database',
          description: 'Allow MySQL to Database-SG'
        },
        {
          protocol: '-1',
          portRange: 'All',
          destination: '0.0.0.0/0',
          description: 'Allow all outbound traffic'
        }
      ],
      ec2Count: 1,
      rdsCount: 0,
      type: 'sg'
    },
    {
      id: 'sg-apiserver',
      name: 'APIServer-SG',
      description: 'Security group for API servers',
      vpcId: 'vpc-12345',
      inboundRules: [
        {
          protocol: 'tcp',
          portRange: '443',
          source: '0.0.0.0/0',
          description: 'Allow HTTPS from anywhere'
        },
        {
          protocol: 'tcp',
          portRange: '22',
          source: '10.0.0.0/16',
          description: 'Allow SSH from VPC'
        }
      ],
      outboundRules: [
        {
          protocol: 'tcp',
          portRange: '3306',
          destination: 'sg-database',
          description: 'Allow MySQL to Database-SG'
        },
        {
          protocol: '-1',
          portRange: 'All',
          destination: '0.0.0.0/0',
          description: 'Allow all outbound traffic'
        }
      ],
      ec2Count: 1,
      rdsCount: 0,
      type: 'sg'
    },
    {
      id: 'sg-management',
      name: 'Management-SG',
      description: 'Security group for management servers',
      vpcId: 'vpc-12345',
      inboundRules: [
        {
          protocol: 'tcp',
          portRange: '22',
          source: '0.0.0.0/0',
          description: 'Allow SSH from anywhere'
        }
      ],
      outboundRules: [
        {
          protocol: '-1',
          portRange: 'All',
          destination: '0.0.0.0/0',
          description: 'Allow all outbound traffic'
        }
      ],
      ec2Count: 1,
      rdsCount: 0,
      type: 'sg'
    },
    {
      id: 'sg-database',
      name: 'Database-SG',
      description: 'Security group for RDS databases',
      vpcId: 'vpc-12345',
      inboundRules: [
        {
          protocol: 'tcp',
          portRange: '3306',
          source: 'sg-webserver',
          description: 'Allow MySQL from WebServer-SG'
        },
        {
          protocol: 'tcp',
          portRange: '3306',
          source: 'sg-apiserver',
          description: 'Allow MySQL from APIServer-SG'
        },
        {
          protocol: 'tcp',
          portRange: '3306',
          source: 'sg-management',
          description: 'Allow MySQL from Management-SG'
        }
      ],
      outboundRules: [
        {
          protocol: '-1',
          portRange: 'All',
          destination: '0.0.0.0/0',
          description: 'Allow all outbound traffic'
        }
      ],
      ec2Count: 0,
      rdsCount: 1,
      type: 'sg'
    },
    {
      id: 'sg-analytics',
      name: 'Analytics-SG',
      description: 'Security group for analytics database',
      vpcId: 'vpc-12345',
      inboundRules: [
        {
          protocol: 'tcp',
          portRange: '5432',
          source: 'sg-management',
          description: 'Allow PostgreSQL from Management-SG'
        }
      ],
      outboundRules: [
        {
          protocol: '-1',
          portRange: 'All',
          destination: '0.0.0.0/0',
          description: 'Allow all outbound traffic'
        }
      ],
      ec2Count: 0,
      rdsCount: 1,
      type: 'sg'
    }
  ],
  connections: [
    {
      sourceId: 'i-12345',
      targetId: 'db-12345',
      status: 'allowed',
      errorMessage: null
    },
    {
      sourceId: 'i-12345',
      targetId: 'db-67890',
      status: 'blocked',
      errorMessage: 'Security group sg-analytics does not allow inbound traffic from sg-webserver on port 5432'
    },
    {
      sourceId: 'i-23456',
      targetId: 'db-12345',
      status: 'allowed',
      errorMessage: null
    },
    {
      sourceId: 'i-34567',
      targetId: 'db-12345',
      status: 'allowed',
      errorMessage: null
    },
    {
      sourceId: 'i-34567',
      targetId: 'db-67890',
      status: 'allowed',
      errorMessage: null
    }
  ]
};
