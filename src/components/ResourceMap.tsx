
import { useRef, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Network, Shield, Server, Database, Globe, AlertTriangle, Layers } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import ec2Logo from "../assets/aws-logos/ec2.svg";
import rdsLogo from "../assets/aws-logos/rds.svg";
import vpcLogo from "../assets/aws-logos/vpc.svg";
import igwLogo from "../assets/aws-logos/igw.svg";
import subnetLogo from "../assets/aws-logos/subnet.svg";
import sgLogo from "../assets/aws-logos/sg.svg";

interface ResourceMapProps {
  data: any;
  onResourceClick: (resource: any) => void;
  visibleResources: string[];
}

export const ResourceMap = ({ data, onResourceClick, visibleResources }: ResourceMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [resourcePositions, setResourcePositions] = useState<any>({});
  const [hoveredConnection, setHoveredConnection] = useState<any>(null);
  const [scale, setScale] = useState(1);
  const [awsLogos, setAwsLogos] = useState<Record<string, HTMLImageElement>>({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState([1]);

  useEffect(() => {
    const logoSources = {
      ec2: ec2Logo,
      rds: rdsLogo,
      vpc: vpcLogo,
      igw: igwLogo,
      subnet: subnetLogo,
      sg: sgLogo
    };
    
    const loadedImages: Record<string, HTMLImageElement> = {};
    
    Object.entries(logoSources).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedImages[key] = img;
        if (Object.keys(loadedImages).length === Object.keys(logoSources).length) {
          setAwsLogos(loadedImages);
        }
      };
    });
  }, []);

  const getTooltipPosition = (x: number, y: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (x * scale + pan.x) * zoomLevel[0] + rect.left,
      y: (y * scale + pan.y) * zoomLevel[0] + rect.top
    };
  };

  useEffect(() => {
    if (!data) return;
    
    const positions: any = {};
    
    // Adjust layout to match AWS architecture diagram
    const vpcsCount = data.vpcs.length;
    const vpcsPerRow = Math.ceil(Math.sqrt(vpcsCount));
    const vpcWidth = 1200;  // Increased width to accommodate more components
    const vpcHeight = 1000; // Increased height to accommodate more components
    const vpcSpacing = 400;
    
    data.vpcs.forEach((vpc: any, vpcIndex: number) => {
      const vpcX = (vpcIndex % vpcsPerRow) * (vpcWidth + vpcSpacing) + 150;
      const vpcY = Math.floor(vpcIndex / vpcsPerRow) * (vpcHeight + vpcSpacing) + 200; // More space at top
      
      positions[`vpc-${vpc.id}`] = { x: vpcX, y: vpcY, width: vpcWidth, height: vpcHeight };
      
      // Add Internet Gateway
      if (vpc.internetGateway) {
        positions[`igw-${vpc.internetGateway.id}`] = {
          x: vpcX + vpcWidth / 2,
          y: vpcY - 100,
          width: 60,
          height: 60
        };
      }
      
      // Create layout with availability zones
      const zoneWidth = (vpcWidth - 100) / 2;
      const zoneHeight = vpcHeight - 80;
      
      // Zone 1
      positions[`zone-1-${vpc.id}`] = {
        x: vpcX + 50,
        y: vpcY + 40,
        width: zoneWidth,
        height: zoneHeight
      };
      
      // Zone 2
      positions[`zone-2-${vpc.id}`] = {
        x: vpcX + 50 + zoneWidth,
        y: vpcY + 40,
        width: zoneWidth,
        height: zoneHeight
      };
      
      // Add subnets within each zone
      vpc.subnets.forEach((subnet: any, subnetIndex: number) => {
        // Determine if this is a public, web, app, or DB subnet
        let subnetType = "private";
        if (subnet.name.toLowerCase().includes("public")) {
          subnetType = "public";
        } else if (subnet.name.toLowerCase().includes("web")) {
          subnetType = "web";
        } else if (subnet.name.toLowerCase().includes("app")) {
          subnetType = "app";
        } else if (subnet.name.toLowerCase().includes("db")) {
          subnetType = "db";
        }
        
        // Calculate subnet position based on type
        let subnetY = 0;
        const subnetHeight = 140;
        const subnetSpacing = 30;
        
        if (subnetType === "public") subnetY = vpcY + 80;
        else if (subnetType === "web") subnetY = vpcY + 260;
        else if (subnetType === "app") subnetY = vpcY + 440;
        else if (subnetType === "db") subnetY = vpcY + 620;
        else subnetY = vpcY + 800;
        
        // Alternate between zone 1 and zone 2
        const zoneIndex = subnetIndex % 2;
        const zoneX = zoneIndex === 0 ? positions[`zone-1-${vpc.id}`].x : positions[`zone-2-${vpc.id}`].x;
        const zoneWidth = positions[`zone-1-${vpc.id}`].width;
        
        const subnetX = zoneX + 20;
        const subnetWidth = zoneWidth - 40;
        
        positions[`subnet-${subnet.id}`] = {
          x: subnetX,
          y: subnetY,
          width: subnetWidth,
          height: subnetHeight,
          type: subnetType,
          zone: zoneIndex === 0 ? "zone-1" : "zone-2"
        };
        
        // Add instances to subnet based on type
        if (["web", "app"].includes(subnetType)) {
          const instances = data.ec2Instances.filter((ec2: any) => ec2.subnetId === subnet.id);
          const instancesPerRow = Math.ceil(Math.sqrt(instances.length));
          const instanceWidth = 55;
          const instanceHeight = 55;
          const instanceSpacing = 15;
          
          instances.forEach((instance: any, instanceIndex: number) => {
            const instanceX = subnetX + 40 + (instanceIndex % instancesPerRow) * (instanceWidth + instanceSpacing);
            const instanceY = subnetY + 50 + Math.floor(instanceIndex / instancesPerRow) * (instanceHeight + instanceSpacing);
            
            positions[`ec2-${instance.id}`] = {
              x: instanceX,
              y: instanceY,
              width: instanceWidth,
              height: instanceHeight,
              securityGroups: instance.securityGroups.map((sg: any) => sg.groupId),
              type: subnetType
            };
          });
        }
        
        // Add RDS instances to DB subnets
        if (subnetType === "db") {
          const rdsInstances = data.rdsInstances.filter((rds: any) => 
            rds.subnetGroup.includes(subnet.id)
          );
          const rdsWidth = 55;
          const rdsHeight = 55;
          const rdsSpacing = 80;
          
          rdsInstances.forEach((rds: any, rdsIndex: number) => {
            const rdsX = subnetX + subnetWidth / 2 - rdsWidth / 2;
            const rdsY = subnetY + 50;
            
            positions[`rds-${rds.id}`] = {
              x: rdsX,
              y: rdsY,
              width: rdsWidth,
              height: rdsHeight,
              securityGroups: rds.securityGroups.map((sg: any) => sg.groupId),
              zone: zoneIndex === 0 ? "zone-1" : "zone-2"
            };
          });
        }
      });
    });
    
    setResourcePositions(positions);
  }, [data]);

  useEffect(() => {
    if (!canvasRef.current || !data || Object.keys(resourcePositions).length === 0 || Object.keys(awsLogos).length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the entire canvas with the current transformation
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // Apply pan and zoom transformations
    ctx.setTransform(
      zoomLevel[0],
      0,
      0,
      zoomLevel[0],
      pan.x * zoomLevel[0],
      pan.y * zoomLevel[0]
    );
    
    // Draw AWS cloud container
    if (visibleResources.includes('vpc')) {
      ctx.fillStyle = '#f0f7fa';
      ctx.strokeStyle = '#d0e0eb';
      ctx.lineWidth = 2;
      
      data.vpcs.forEach((vpc: any) => {
        const pos = resourcePositions[`vpc-${vpc.id}`];
        if (!pos) return;
        
        // Draw AWS cloud header
        ctx.fillStyle = '#232f3e';
        ctx.fillRect(pos.x - 30, pos.y - 150, pos.width + 60, 70);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('AWS Cloud', pos.x + 80, pos.y - 105);
        
        // Draw VPC container
        ctx.fillStyle = 'rgba(240, 247, 250, 0.6)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        
        if (awsLogos.vpc) {
          ctx.drawImage(awsLogos.vpc, pos.x + 10, pos.y + 10, 35, 35);
        }
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`VPC: ${vpc.name}`, pos.x + 55, pos.y + 32);
        ctx.font = '16px Arial';
        ctx.fillText(`CIDR: ${vpc.cidr}`, pos.x + 20, pos.y + 60);
        
        // Draw Availability Zones
        const zonePos1 = resourcePositions[`zone-1-${vpc.id}`];
        const zonePos2 = resourcePositions[`zone-2-${vpc.id}`];
        
        if (zonePos1) {
          ctx.strokeStyle = '#8dabca';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
          ctx.strokeRect(zonePos1.x, zonePos1.y, zonePos1.width, zonePos1.height);
          ctx.setLineDash([]);
          
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#3f6693';
          ctx.fillText('Availability Zone 1', zonePos1.x + 20, zonePos1.y + 20);
        }
        
        if (zonePos2) {
          ctx.strokeStyle = '#8dabca';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
          ctx.strokeRect(zonePos2.x, zonePos2.y, zonePos2.width, zonePos2.height);
          ctx.setLineDash([]);
          
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#3f6693';
          ctx.fillText('Availability Zone 2', zonePos2.x + 20, zonePos2.y + 20);
        }
      });
    }
    
    if (visibleResources.includes('igw')) {
      data.vpcs.forEach((vpc: any) => {
        if (vpc.internetGateway) {
          const igw = vpc.internetGateway;
          const pos = resourcePositions[`igw-${igw.id}`];
          if (!pos) return;
          
          ctx.fillStyle = '#f0f9ff';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          if (awsLogos.igw) {
            ctx.drawImage(awsLogos.igw, pos.x - 22, pos.y - 22, 44, 44);
          }
          
          ctx.fillStyle = '#000';
          ctx.font = '14px Arial';
          ctx.fillText('IGW', pos.x - 14, pos.y + 45);
        }
      });
    }
    
    if (visibleResources.includes('subnet')) {
      data.vpcs.forEach((vpc: any) => {
        vpc.subnets.forEach((subnet: any) => {
          const pos = resourcePositions[`subnet-${subnet.id}`];
          if (!pos) return;
          
          const subnetType = pos.type || (subnet.isPublic ? 'public' : 'private');
          
          let fillColor = 'rgba(254, 242, 232, 0.5)'; // Default private
          let strokeColor = '#ea580c';
          
          if (subnetType === 'public') {
            fillColor = 'rgba(220, 252, 231, 0.5)';
            strokeColor = '#16a34a';
          } else if (subnetType === 'web') {
            fillColor = 'rgba(219, 234, 254, 0.5)';
            strokeColor = '#2563eb';
          } else if (subnetType === 'app') {
            fillColor = 'rgba(238, 242, 255, 0.5)';
            strokeColor = '#4f46e5';
          } else if (subnetType === 'db') {
            fillColor = 'rgba(254, 242, 232, 0.5)';
            strokeColor = '#ea580c';
          }
          
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
          
          if (awsLogos.subnet) {
            ctx.drawImage(awsLogos.subnet, pos.x + 8, pos.y + 8, 24, 24);
          }
          
          ctx.fillStyle = '#000';
          ctx.font = 'bold 16px Arial';
          const subnetName = subnetType.charAt(0).toUpperCase() + subnetType.slice(1) + ' Subnet';
          ctx.fillText(subnetName, pos.x + 40, pos.y + 25);
          ctx.font = '14px Arial';
          ctx.fillText(`CIDR: ${subnet.cidr}`, pos.x + 15, pos.y + 50);
        });
      });
    }
    
    if (visibleResources.includes('ec2')) {
      data.ec2Instances.forEach((ec2: any) => {
        const pos = resourcePositions[`ec2-${ec2.id}`];
        if (!pos) return;
        
        if (visibleResources.includes('sg')) {
          ctx.fillStyle = 'rgba(226, 232, 240, 0.3)';
          ctx.strokeStyle = '#64748b';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(pos.x + pos.width/2, pos.y + pos.height/2, pos.width * 0.9, pos.height * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
          
          if (awsLogos.sg) {
            ctx.drawImage(awsLogos.sg, pos.x - 12, pos.y - 12, 18, 18);
          }
        }
        
        if (awsLogos.ec2) {
          ctx.drawImage(awsLogos.ec2, pos.x, pos.y, pos.width, pos.height);
        } else {
          ctx.fillStyle = '#f1f5f9';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        }
        
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        const instanceIdText = ec2.instanceId && typeof ec2.instanceId === 'string' 
          ? ec2.instanceId.split('-').pop() 
          : (ec2.id && ec2.id.toString ? ec2.id.toString().substring(0, 6) : '');
        
        const typeText = pos.type === 'web' ? 'Web server' : 'App server';
        ctx.fillText(typeText, pos.x, pos.y - 5);
      });
    }
    
    if (visibleResources.includes('rds')) {
      data.rdsInstances.forEach((rds: any) => {
        const pos = resourcePositions[`rds-${rds.id}`];
        if (!pos) return;
        
        if (visibleResources.includes('sg')) {
          ctx.fillStyle = 'rgba(226, 232, 240, 0.3)';
          ctx.strokeStyle = '#64748b';
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(pos.x + pos.width/2, pos.y + pos.height/2, pos.width * 0.9, pos.height * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
          
          if (awsLogos.sg) {
            ctx.drawImage(awsLogos.sg, pos.x - 12, pos.y - 12, 18, 18);
          }
        }
        
        if (awsLogos.rds) {
          ctx.drawImage(awsLogos.rds, pos.x, pos.y, pos.width, pos.height);
        } else {
          ctx.fillStyle = '#f8fafc';
          ctx.strokeStyle = '#0369a1';
          ctx.lineWidth = 1;
          ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        }
        
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        const rdsIdText = rds.id && typeof rds.id === 'string' 
          ? rds.id.split('-').pop() 
          : (rds.id && rds.id.toString ? rds.id.toString().substring(0, 6) : '');
        
        const roleText = pos.zone === 'zone-1' ? 'RDS (Primary)' : 'RDS (Secondary)';
        ctx.fillText(roleText, pos.x, pos.y - 5);
      });
    }
    
    // Draw connections between EC2 and RDS
    if (visibleResources.includes('ec2') && visibleResources.includes('rds')) {
      data.connections.forEach((connection: any) => {
        const sourcePos = resourcePositions[`ec2-${connection.sourceId}`];
        const targetPos = resourcePositions[`rds-${connection.targetId}`];
        
        if (!sourcePos || !targetPos) return;
        
        const sourceX = sourcePos.x + sourcePos.width/2;
        const sourceY = sourcePos.y + sourcePos.height/2;
        const targetX = targetPos.x + targetPos.width/2;
        const targetY = targetPos.y + targetPos.height/2;
        
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(targetX, targetY);
        
        if (connection.status === 'allowed') {
          ctx.strokeStyle = '#22c55e';
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = '#ef4444';
          ctx.setLineDash([5, 3]);
        }
        
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        
        const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
        const arrowSize = 8;
        
        ctx.beginPath();
        ctx.moveTo(
          targetX - arrowSize * Math.cos(angle) + arrowSize * Math.sin(angle),
          targetY - arrowSize * Math.sin(angle) - arrowSize * Math.cos(angle)
        );
        ctx.lineTo(targetX, targetY);
        ctx.lineTo(
          targetX - arrowSize * Math.cos(angle) - arrowSize * Math.sin(angle),
          targetY - arrowSize * Math.sin(angle) + arrowSize * Math.cos(angle)
        );
        ctx.stroke();
        
        if (connection.status === 'blocked') {
          const midX = (sourceX + targetX) / 2;
          const midY = (sourceY + targetY) / 2;
          
          ctx.fillStyle = '#fef2f2';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(midX, midY, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('!', midX - 3, midY + 5);
        }
      });
    }
    
    // Draw load balancers and auto scaling groups
    data.vpcs.forEach((vpc: any) => {
      // Add ELB between public and web subnets
      const webSubnets = vpc.subnets.filter((subnet: any) => 
        resourcePositions[`subnet-${subnet.id}`]?.type === 'web'
      );
      
      if (webSubnets.length > 0) {
        const firstWebSubnet = resourcePositions[`subnet-${webSubnets[0].id}`];
        if (firstWebSubnet) {
          const elbX = firstWebSubnet.x + firstWebSubnet.width / 2 - 40;
          const elbY = firstWebSubnet.y - 40;
          
          // Draw ELB
          ctx.fillStyle = '#f0f9ff';
          ctx.strokeStyle = '#7e22ce';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(elbX, elbY, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // ELB symbol inside
          ctx.beginPath();
          ctx.moveTo(elbX - 15, elbY - 10);
          ctx.lineTo(elbX + 15, elbY - 10);
          ctx.moveTo(elbX - 15, elbY);
          ctx.lineTo(elbX + 15, elbY);
          ctx.moveTo(elbX - 15, elbY + 10);
          ctx.lineTo(elbX + 15, elbY + 10);
          ctx.strokeStyle = '#7e22ce';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText('Elastic Load Balancing', elbX - 60, elbY + 45);
          ctx.fillText('Web tier', elbX - 25, elbY + 60);
        }
      }
      
      // Add ELB between web and app subnets
      const appSubnets = vpc.subnets.filter((subnet: any) => 
        resourcePositions[`subnet-${subnet.id}`]?.type === 'app'
      );
      
      if (appSubnets.length > 0) {
        const firstAppSubnet = resourcePositions[`subnet-${appSubnets[0].id}`];
        if (firstAppSubnet) {
          const elbX = firstAppSubnet.x + firstAppSubnet.width / 2 - 40;
          const elbY = firstAppSubnet.y - 40;
          
          // Draw ELB
          ctx.fillStyle = '#f0f9ff';
          ctx.strokeStyle = '#7e22ce';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(elbX, elbY, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // ELB symbol inside
          ctx.beginPath();
          ctx.moveTo(elbX - 15, elbY - 10);
          ctx.lineTo(elbX + 15, elbY - 10);
          ctx.moveTo(elbX - 15, elbY);
          ctx.lineTo(elbX + 15, elbY);
          ctx.moveTo(elbX - 15, elbY + 10);
          ctx.lineTo(elbX + 15, elbY + 10);
          ctx.strokeStyle = '#7e22ce';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText('Elastic Load Balancing', elbX - 60, elbY + 45);
          ctx.fillText('App tier', elbX - 25, elbY + 60);
        }
      }
      
      // Add Auto Scaling Group label for Web tier
      if (webSubnets.length > 0) {
        const firstWebSubnet = resourcePositions[`subnet-${webSubnets[0].id}`];
        if (firstWebSubnet) {
          const asgX = firstWebSubnet.x + firstWebSubnet.width / 2 + 60;
          const asgY = firstWebSubnet.y + firstWebSubnet.height / 2;
          
          // Draw ASG icon
          ctx.fillStyle = '#fff7ed';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(asgX, asgY, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw arrows in four directions
          const arrowSize = 10;
          ctx.beginPath();
          // Up arrow
          ctx.moveTo(asgX, asgY - arrowSize);
          ctx.lineTo(asgX - arrowSize/2, asgY - arrowSize/2);
          ctx.moveTo(asgX, asgY - arrowSize);
          ctx.lineTo(asgX + arrowSize/2, asgY - arrowSize/2);
          // Right arrow
          ctx.moveTo(asgX + arrowSize, asgY);
          ctx.lineTo(asgX + arrowSize/2, asgY - arrowSize/2);
          ctx.moveTo(asgX + arrowSize, asgY);
          ctx.lineTo(asgX + arrowSize/2, asgY + arrowSize/2);
          // Down arrow
          ctx.moveTo(asgX, asgY + arrowSize);
          ctx.lineTo(asgX - arrowSize/2, asgY + arrowSize/2);
          ctx.moveTo(asgX, asgY + arrowSize);
          ctx.lineTo(asgX + arrowSize/2, asgY + arrowSize/2);
          // Left arrow
          ctx.moveTo(asgX - arrowSize, asgY);
          ctx.lineTo(asgX - arrowSize/2, asgY - arrowSize/2);
          ctx.moveTo(asgX - arrowSize, asgY);
          ctx.lineTo(asgX - arrowSize/2, asgY + arrowSize/2);
          
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText('Auto Scaling group', asgX - 55, asgY + 45);
          ctx.fillText('Web tier', asgX - 25, asgY + 60);
        }
      }
      
      // Add Auto Scaling Group label for App tier
      if (appSubnets.length > 0) {
        const firstAppSubnet = resourcePositions[`subnet-${appSubnets[0].id}`];
        if (firstAppSubnet) {
          const asgX = firstAppSubnet.x + firstAppSubnet.width / 2 + 60;
          const asgY = firstAppSubnet.y + firstAppSubnet.height / 2;
          
          // Draw ASG icon
          ctx.fillStyle = '#fff7ed';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(asgX, asgY, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw arrows in four directions
          const arrowSize = 10;
          ctx.beginPath();
          // Up arrow
          ctx.moveTo(asgX, asgY - arrowSize);
          ctx.lineTo(asgX - arrowSize/2, asgY - arrowSize/2);
          ctx.moveTo(asgX, asgY - arrowSize);
          ctx.lineTo(asgX + arrowSize/2, asgY - arrowSize/2);
          // Right arrow
          ctx.moveTo(asgX + arrowSize, asgY);
          ctx.lineTo(asgX + arrowSize/2, asgY - arrowSize/2);
          ctx.moveTo(asgX + arrowSize, asgY);
          ctx.lineTo(asgX + arrowSize/2, asgY + arrowSize/2);
          // Down arrow
          ctx.moveTo(asgX, asgY + arrowSize);
          ctx.lineTo(asgX - arrowSize/2, asgY + arrowSize/2);
          ctx.moveTo(asgX, asgY + arrowSize);
          ctx.lineTo(asgX + arrowSize/2, asgY + arrowSize/2);
          // Left arrow
          ctx.moveTo(asgX - arrowSize, asgY);
          ctx.lineTo(asgX - arrowSize/2, asgY - arrowSize/2);
          ctx.moveTo(asgX - arrowSize, asgY);
          ctx.lineTo(asgX - arrowSize/2, asgY + arrowSize/2);
          
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText('Auto Scaling group', asgX - 55, asgY + 45);
          ctx.fillText('App tier', asgX - 25, asgY + 60);
        }
      }
    });
    
  }, [data, resourcePositions, visibleResources, awsLogos, pan, zoomLevel]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data || isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x * zoomLevel[0]) / zoomLevel[0];
    const y = (e.clientY - rect.top - pan.y * zoomLevel[0]) / zoomLevel[0];
    
    for (const [key, pos] of Object.entries(resourcePositions)) {
      const [type, id] = key.split('-');
      if (!visibleResources.includes(type) || !['vpc', 'subnet', 'ec2', 'rds', 'igw'].includes(type)) continue;
      
      const { x: posX, y: posY, width, height } = pos as any;
      if (x >= posX && x <= posX + width && y >= posY && y <= posY + height) {
        let resource;
        switch (type) {
          case 'vpc':
            resource = data.vpcs.find((vpc: any) => vpc.id === id);
            break;
          case 'subnet':
            resource = data.vpcs.flatMap((vpc: any) => vpc.subnets).find((subnet: any) => subnet.id === id);
            break;
          case 'ec2':
            resource = data.ec2Instances.find((ec2: any) => ec2.id === id);
            break;
          case 'rds':
            resource = data.rdsInstances.find((rds: any) => rds.id === id);
            break;
          case 'igw':
            resource = data.vpcs
              .filter((vpc: any) => vpc.internetGateway)
              .map((vpc: any) => vpc.internetGateway)
              .find((igw: any) => igw.id === id);
            break;
        }
        
        if (resource) {
          onResourceClick({ ...resource, type });
          return;
        }
      }
    }
    
    for (const connection of data.connections) {
      const sourcePos = resourcePositions[`ec2-${connection.sourceId}`];
      const targetPos = resourcePositions[`rds-${connection.targetId}`];
      
      if (!sourcePos || !targetPos) continue;
      
      const sourceX = sourcePos.x + sourcePos.width/2;
      const sourceY = sourcePos.y + sourcePos.height/2;
      const targetX = targetPos.x + targetPos.width/2;
      const targetY = targetPos.y + targetPos.height/2;
      
      const distance = distanceToLine(x, y, sourceX, sourceY, targetX, targetY);
      if (distance < 10) {
        const source = data.ec2Instances.find((ec2: any) => ec2.id === connection.sourceId);
        const target = data.rdsInstances.find((rds: any) => rds.id === connection.targetId);
        
        if (source && target) {
          setHoveredConnection({
            ...connection,
            source,
            target,
            x: (sourceX + targetX) / 2,
            y: (sourceY + targetY) / 2
          });
          return;
        }
      }
    }
  };

  const distanceToLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const param = dot / len_sq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const x = (mouseX - pan.x * zoomLevel[0]) / zoomLevel[0];
    const y = (mouseY - pan.y * zoomLevel[0]) / zoomLevel[0];
    
    // Handle dragging
    if (isDragging) {
      const dx = (mouseX - startPan.x) / zoomLevel[0];
      const dy = (mouseY - startPan.y) / zoomLevel[0];
      
      setPan({
        x: pan.x + dx,
        y: pan.y + dy
      });
      
      setStartPan({
        x: mouseX,
        y: mouseY
      });
      return;
    }
    
    // Connection hovering
    let foundConnection = false;
    for (const connection of data.connections) {
      if (connection.status !== 'blocked') continue;
      
      const sourcePos = resourcePositions[`ec2-${connection.sourceId}`];
      const targetPos = resourcePositions[`rds-${connection.targetId}`];
      
      if (!sourcePos || !targetPos) continue;
      
      const sourceX = sourcePos.x + sourcePos.width/2;
      const sourceY = sourcePos.y + sourcePos.height/2;
      const targetX = targetPos.x + targetPos.width/2;
      const targetY = targetPos.y + targetPos.height/2;
      
      const distance = distanceToLine(x, y, sourceX, sourceY, targetX, targetY);
      if (distance < 10) {
        const source = data.ec2Instances.find((ec2: any) => ec2.id === connection.sourceId);
        const target = data.rdsInstances.find((rds: any) => rds.id === connection.targetId);
        
        if (source && target) {
          setHoveredConnection({
            ...connection,
            source,
            target,
            x: (sourceX + targetX) / 2,
            y: (sourceY + targetY) / 2
          });
          foundConnection = true;
          break;
        }
      }
    }
    
    if (!foundConnection && hoveredConnection) {
      setHoveredConnection(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    setIsDragging(true);
    setStartPan({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    canvas.style.cursor = 'grabbing';
  };

  const handleMouseUp = () => {
    if (!canvasRef.current) return;
    
    setIsDragging(false);
    canvasRef.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  const handleZoomChange = (newZoom: number[]) => {
    setZoomLevel(newZoom);
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoomLevel([1]);
  };
  
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const resizeCanvas = () => {
      if (!canvasRef.current || !containerRef.current) return;
      
      const { width, height } = containerRef.current.getBoundingClientRect();
      
      canvasRef.current.width = width * 2;
      canvasRef.current.height = height * 2;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
      }
      
      setScale(2);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetView}
            className="text-xs"
          >
            Reset View
          </Button>
        </div>
        <div className="flex items-center w-48 mr-4">
          <span className="text-xs mr-2">Zoom:</span>
          <Slider
            value={zoomLevel}
            onValueChange={handleZoomChange}
            min={0.5}
            max={2}
            step={0.1}
            className="w-32"
          />
          <span className="text-xs ml-2">{Math.round(zoomLevel[0] * 100)}%</span>
        </div>
      </div>
      
      <div ref={containerRef} className="w-full flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="cursor-grab"
        />
        
        {hoveredConnection && (
          <TooltipProvider>
            <Tooltip open={true}>
              <TooltipTrigger asChild>
                <div 
                  className="absolute w-1 h-1 bg-transparent" 
                  style={{ 
                    left: getTooltipPosition(hoveredConnection.x, hoveredConnection.y).x, 
                    top: getTooltipPosition(hoveredConnection.x, hoveredConnection.y).y 
                  }}
                />
              </TooltipTrigger>
              <TooltipContent className="bg-red-50 text-red-700 border border-red-200 p-2 max-w-xs">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">Connection Blocked</div>
                    <div className="text-sm mt-1">{hoveredConnection.errorMessage}</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 bg-white/80 dark:bg-gray-800/80 rounded p-2 text-xs shadow-md">
        <div className="flex items-center">
          <img src={vpcLogo} alt="VPC" className="h-4 w-4 mr-1" />
          <span>VPC</span>
        </div>
        <div className="flex items-center">
          <Layers className="h-4 w-4 mr-1 text-emerald-500" />
          <span>Public Subnet</span>
        </div>
        <div className="flex items-center">
          <Layers className="h-4 w-4 mr-1 text-blue-500" />
          <span>Web Subnet</span>
        </div>
        <div className="flex items-center">
          <Layers className="h-4 w-4 mr-1 text-indigo-500" />
          <span>App Subnet</span>
        </div>
        <div className="flex items-center">
          <Layers className="h-4 w-4 mr-1 text-orange-500" />
          <span>DB Subnet</span>
        </div>
        <div className="flex items-center">
          <img src={ec2Logo} alt="EC2" className="h-4 w-4 mr-1" />
          <span>EC2</span>
        </div>
        <div className="flex items-center">
          <img src={rdsLogo} alt="RDS" className="h-4 w-4 mr-1" />
          <span>RDS</span>
        </div>
        <div className="flex items-center">
          <img src={igwLogo} alt="IGW" className="h-4 w-4 mr-1" />
          <span>IGW</span>
        </div>
        <div className="flex items-center">
          <img src={sgLogo} alt="Security Group" className="h-4 w-4 mr-1" />
          <span>Security Group</span>
        </div>
      </div>
    </div>
  );
};
