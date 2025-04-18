import { useRef, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Network, Shield, Server, Database, Globe, AlertTriangle, Layers, Code } from "lucide-react";
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
  const [hoveredResource, setHoveredResource] = useState<any>(null);
  const [scale, setScale] = useState(1);
  const [awsLogos, setAwsLogos] = useState<Record<string, HTMLImageElement>>({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState([1]);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showAllConnections, setShowAllConnections] = useState(true);

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

  const [tooltipElement, setTooltipElement] = useState<HTMLDivElement | null>(null);
  
  useEffect(() => {
    if (!tooltipElement) {
      const tooltip = document.createElement('div');
      tooltip.className = 'fixed z-[200] bg-white dark:bg-gray-800 shadow-lg rounded-md p-3 border border-gray-200 dark:border-gray-700 max-w-xs opacity-0 pointer-events-none transition-opacity duration-200';
      tooltip.style.display = 'none';
      document.body.appendChild(tooltip);
      setTooltipElement(tooltip);
      
      return () => {
        document.body.removeChild(tooltip);
      };
    }
  }, []);

  const showTooltip = (content: string, x: number, y: number) => {
    if (!tooltipElement) return;
    
    tooltipElement.innerHTML = content;
    tooltipElement.style.display = 'block';
    tooltipElement.style.left = `${x}px`;
    tooltipElement.style.top = `${y}px`;
    tooltipElement.style.transform = 'translate(-50%, -100%)';
    
    requestAnimationFrame(() => {
      if (tooltipElement) tooltipElement.style.opacity = '1';
    });
  };

  const hideTooltip = () => {
    if (!tooltipElement) return;
    
    tooltipElement.style.opacity = '0';
    setTimeout(() => {
      if (tooltipElement) tooltipElement.style.display = 'none';
    }, 200);
  };

  useEffect(() => {
    if (!data) return;
    
    const positions: any = {};
    
    const vpcsCount = data.vpcs.length;
    const vpcsPerRow = Math.ceil(Math.sqrt(vpcsCount));
    const vpcWidth = 1000;
    const vpcHeight = 800;
    const vpcSpacing = 300;
    
    data.vpcs.forEach((vpc: any, vpcIndex: number) => {
      const vpcX = (vpcIndex % vpcsPerRow) * (vpcWidth + vpcSpacing) + 150;
      const vpcY = Math.floor(vpcIndex / vpcsPerRow) * (vpcHeight + vpcSpacing) + 150;
      
      positions[`vpc-${vpc.id}`] = { x: vpcX, y: vpcY, width: vpcWidth, height: vpcHeight };
      
      if (vpc.internetGateway) {
        positions[`igw-${vpc.internetGateway.id}`] = {
          x: vpcX + vpcWidth / 2,
          y: vpcY - 100,
          width: 60,
          height: 60
        };
      }
      
      const subnetsPerRow = Math.ceil(Math.sqrt(vpc.subnets.length));
      const subnetWidth = (vpcWidth - 100) / subnetsPerRow;
      const subnetHeight = (vpcHeight - 150) / Math.ceil(vpc.subnets.length / subnetsPerRow);
      
      vpc.subnets.forEach((subnet: any, subnetIndex: number) => {
        const subnetX = vpcX + 50 + (subnetIndex % subnetsPerRow) * subnetWidth;
        const subnetY = vpcY + 100 + Math.floor(subnetIndex / subnetsPerRow) * subnetHeight;
        
        positions[`subnet-${subnet.id}`] = {
          x: subnetX,
          y: subnetY,
          width: subnetWidth - 30,
          height: subnetHeight - 30
        };
        
        const instances = data.ec2Instances.filter((ec2: any) => ec2.subnetId === subnet.id);
        const instancesPerRow = Math.ceil(Math.sqrt(instances.length));
        const instanceWidth = 50;
        const instanceHeight = 50;
        const instanceSpacing = 35;
        
        instances.forEach((instance: any, instanceIndex: number) => {
          const instanceX = subnetX + 40 + (instanceIndex % instancesPerRow) * (instanceWidth + instanceSpacing);
          const instanceY = subnetY + 70 + Math.floor(instanceIndex / instancesPerRow) * (instanceHeight + instanceSpacing);
          
          positions[`ec2-${instance.id}`] = {
            x: instanceX,
            y: instanceY,
            width: instanceWidth,
            height: instanceHeight,
            securityGroups: instance.securityGroups.map((sg: any) => sg.groupId)
          };
        });
        
        const rdsInstances = data.rdsInstances.filter((rds: any) => 
          rds.subnetGroup.includes(subnet.id)
        );
        const rdsPerRow = Math.ceil(Math.sqrt(rdsInstances.length));
        const rdsWidth = 50;
        const rdsHeight = 50;
        const rdsSpacing = 35;
        
        rdsInstances.forEach((rds: any, rdsIndex: number) => {
          const rdsX = subnetX + subnetWidth - 90 - (rdsIndex % rdsPerRow) * (rdsWidth + rdsSpacing);
          const rdsY = subnetY + subnetHeight - 90 - Math.floor(rdsIndex / rdsPerRow) * (rdsHeight + rdsSpacing);
          
          positions[`rds-${rds.id}`] = {
            x: rdsX,
            y: rdsY,
            width: rdsWidth,
            height: rdsHeight,
            securityGroups: rds.securityGroups.map((sg: any) => sg.groupId)
          };
        });
        
        // Position Lambda functions
        const lambdaFunctions = data.lambdaFunctions?.filter((lambda: any) => 
          lambda.subnetIds?.includes(subnet.id)
        ) || [];
        
        const lambdaPerRow = Math.ceil(Math.sqrt(lambdaFunctions.length));
        const lambdaWidth = 50;
        const lambdaHeight = 50;
        const lambdaSpacing = 35;
        
        lambdaFunctions.forEach((lambda: any, lambdaIndex: number) => {
          const lambdaX = subnetX + subnetWidth - 180 - (lambdaIndex % lambdaPerRow) * (lambdaWidth + lambdaSpacing);
          const lambdaY = subnetY + 70 + Math.floor(lambdaIndex / lambdaPerRow) * (lambdaHeight + lambdaSpacing);
          
          positions[`lambda-${lambda.id}`] = {
            x: lambdaX,
            y: lambdaY,
            width: lambdaWidth,
            height: lambdaHeight,
            securityGroups: lambda.securityGroups?.map((sg: any) => sg.groupId) || []
          };
        });
      });
    });
    
    // Handle Lambda functions not associated with a VPC
    const nonVpcLambdas = data.lambdaFunctions?.filter((lambda: any) => !lambda.vpcId) || [];
    if (nonVpcLambdas.length > 0) {
      const lambdaPerRow = Math.ceil(Math.sqrt(nonVpcLambdas.length));
      const lambdaWidth = 50;
      const lambdaHeight = 50;
      const lambdaSpacing = 60;
      const startX = 100;
      const startY = data.vpcs.length > 0 ? 
        Math.max(...data.vpcs.map((vpc: any) => resourcePositions[`vpc-${vpc.id}`]?.y + resourcePositions[`vpc-${vpc.id}`]?.height || 0)) + 200 : 
        100;
      
      nonVpcLambdas.forEach((lambda: any, lambdaIndex: number) => {
        const lambdaX = startX + (lambdaIndex % lambdaPerRow) * (lambdaWidth + lambdaSpacing);
        const lambdaY = startY + Math.floor(lambdaIndex / lambdaPerRow) * (lambdaHeight + lambdaSpacing);
        
        positions[`lambda-${lambda.id}`] = {
          x: lambdaX,
          y: lambdaY,
          width: lambdaWidth,
          height: lambdaHeight,
          securityGroups: lambda.securityGroups?.map((sg: any) => sg.groupId) || []
        };
      });
    }
    
    setResourcePositions(positions);
  }, [data]);

  // Enhanced rendering code to show all connections
  useEffect(() => {
    if (!canvasRef.current || !data || Object.keys(resourcePositions).length === 0 || Object.keys(awsLogos).length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    ctx.setTransform(
      zoomLevel[0],
      0,
      0,
      zoomLevel[0],
      pan.x * zoomLevel[0],
      pan.y * zoomLevel[0]
    );
    
    // Draw connection lines first (beneath resources)
    if (showAllConnections) {
      // Draw connections between resources in different subnets
      if (visibleResources.includes('ec2') && visibleResources.includes('subnet')) {
        // Connect EC2 to Internet Gateway if in public subnet
        data.ec2Instances.forEach((ec2: any) => {
          const ec2Pos = resourcePositions[`ec2-${ec2.id}`];
          if (!ec2Pos) return;
          
          // Find the EC2's subnet
          const subnet = data.vpcs.flatMap((vpc: any) => vpc.subnets).find((subnet: any) => subnet.id === ec2.subnetId);
          if (!subnet || !subnet.isPublic) return;
          
          // Find the VPC's internet gateway
          const vpc = data.vpcs.find((vpc: any) => vpc.id === subnet.vpcId);
          if (!vpc || !vpc.internetGateway) return;
          
          const igwPos = resourcePositions[`igw-${vpc.internetGateway.id}`];
          if (!igwPos) return;
          
          const sourceX = ec2Pos.x + ec2Pos.width/2;
          const sourceY = ec2Pos.y + ec2Pos.height/2;
          const targetX = igwPos.x;
          const targetY = igwPos.y;
          
          ctx.beginPath();
          ctx.moveTo(sourceX, sourceY);
          ctx.lineTo(targetX, targetY);
          ctx.strokeStyle = '#0ea5e9';
          ctx.setLineDash([5, 3]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }
      
      // Draw connections between EC2 and RDS
      if (visibleResources.includes('ec2') && visibleResources.includes('rds')) {
        data.connections.filter((conn: any) => 
          conn.sourceType === 'ec2' && conn.targetType === 'rds'
        ).forEach((connection: any) => {
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
      
      // Draw connections between EC2 and Lambda
      if (visibleResources.includes('ec2') && visibleResources.includes('lambda')) {
        data.connections.filter((conn: any) => 
          conn.sourceType === 'ec2' && conn.targetType === 'lambda'
        ).forEach((connection: any) => {
          const sourcePos = resourcePositions[`ec2-${connection.sourceId}`];
          const targetPos = resourcePositions[`lambda-${connection.targetId}`];
          
          if (!sourcePos || !targetPos) return;
          
          const sourceX = sourcePos.x + sourcePos.width/2;
          const sourceY = sourcePos.y + sourcePos.height/2;
          const targetX = targetPos.x + targetPos.width/2;
          const targetY = targetPos.y + targetPos.height/2;
          
          ctx.beginPath();
          ctx.moveTo(sourceX, sourceY);
          ctx.lineTo(targetX, targetY);
          
          if (connection.status === 'allowed') {
            ctx.strokeStyle = '#a855f7'; // Purple for EC2-Lambda connections
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
      
      // Connect Lambda functions to resources they interact with
      if (visibleResources.includes('lambda')) {
        // Connect Lambda functions to RDS instances
        if (visibleResources.includes('rds') && data.lambdaFunctions) {
          data.lambdaFunctions.forEach((lambda: any) => {
            const lambdaPos = resourcePositions[`lambda-${lambda.id}`];
            if (!lambdaPos) return;
            
            data.rdsInstances.forEach((rds: any) => {
              if (lambda.vpcId === rds.vpcId) {
                const rdsPos = resourcePositions[`rds-${rds.id}`];
                if (!rdsPos) return;
                
                const sourceX = lambdaPos.x + lambdaPos.width/2;
                const sourceY = lambdaPos.y + lambdaPos.height/2;
                const targetX = rdsPos.x + rdsPos.width/2;
                const targetY = rdsPos.y + rdsPos.height/2;
                
                ctx.beginPath();
                ctx.moveTo(sourceX, sourceY);
                ctx.lineTo(targetX, targetY);
                ctx.strokeStyle = '#6366f1';
                ctx.setLineDash([2, 2]);
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
                
                const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
                const arrowSize = 6;
                
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
              }
            });
          });
        }
        
        // Connect serverless Lambda to Internet Gateway
        data.lambdaFunctions?.forEach((lambda: any) => {
          if (!lambda.vpcId) {
            const lambdaPos = resourcePositions[`lambda-${lambda.id}`];
            if (!lambdaPos) return;
            
            data.vpcs.forEach((vpc: any) => {
              if (vpc.internetGateway) {
                const igwPos = resourcePositions[`igw-${vpc.internetGateway.id}`];
                if (!igwPos) return;
                
                const sourceX = lambdaPos.x + lambdaPos.width/2;
                const sourceY = lambdaPos.y + lambdaPos.height/2;
                const targetX = igwPos.x;
                const targetY = igwPos.y;
                
                ctx.beginPath();
                ctx.moveTo(sourceX, sourceY);
                ctx.lineTo(targetX, targetY);
                ctx.strokeStyle = '#8b5cf6';
                ctx.setLineDash([4, 2]);
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.setLineDash([]);
              }
            });
          }
        });
      }
    }
    
    if (visibleResources.includes('vpc')) {
      data.vpcs.forEach((vpc: any) => {
        const pos = resourcePositions[`vpc-${vpc.id}`];
        if (!pos) return;
        
        ctx.fillStyle = 'rgba(232, 240, 254, 0.5)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        
        if (awsLogos.vpc) {
          ctx.drawImage(awsLogos.vpc, pos.x + 10, pos.y + 10, 35, 35);
        }
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`VPC: ${vpc.name}`, pos.x + 55, pos.y + 30);
        ctx.font = '16px Arial';
        ctx.fillText(`CIDR: ${vpc.cidr}`, pos.x + 20, pos.y + 65);
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
          
          const isPublic = subnet.isPublic;
          ctx.fillStyle = isPublic ? 'rgba(220, 252, 231, 0.5)' : 'rgba(254, 242, 232, 0.5)';
          ctx.strokeStyle = isPublic ? '#16a34a' : '#ea580c';
          ctx.lineWidth = 1;
          ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
          ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
          
          if (awsLogos.subnet) {
            ctx.drawImage(awsLogos.subnet, pos.x + 8, pos.y + 8, 24, 24);
          }
          
          ctx.fillStyle = '#000';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(`Subnet: ${subnet.name.substring(0, 15)}`, pos.x + 40, pos.y + 25);
          ctx.font = '14px Arial';
          ctx.fillText(`CIDR: ${subnet.cidr}`, pos.x + 15, pos.y + 50);
          ctx.fillText(`${isPublic ? 'Public' : 'Private'}`, pos.x + 15, pos.y + 75);
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
        ctx.fillText(instanceIdText, pos.x, pos.y - 5);
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
        ctx.fillText(rdsIdText, pos.x, pos.y - 5);
      });
    }
    
    if (visibleResources.includes('lambda') && data.lambdaFunctions) {
      data.lambdaFunctions.forEach((lambda: any) => {
        const pos = resourcePositions[`lambda-${lambda.id}`];
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
        }
        
        ctx.fillStyle = '#f1f5f9';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1;
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
        
        ctx.fillStyle = '#6366f1';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('λ', pos.x + 15, pos.y + 32);
        
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        const lambdaIdText = lambda.id && typeof lambda.id === 'string' 
          ? lambda.id.split('-').pop() 
          : (lambda.id && lambda.id.toString ? lambda.id.toString().substring(0, 6) : '');
        ctx.fillText(lambdaIdText, pos.x, pos.y - 5);
      });
    }
  }, [data, resourcePositions, visibleResources, awsLogos, pan, zoomLevel, showAllConnections]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data || isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x * zoomLevel[0]) / zoomLevel[0];
    const y = (e.clientY - rect.top - pan.y * zoomLevel[0]) / zoomLevel[0];
    
    for (const [key, pos] of Object.entries(resourcePositions)) {
      const
