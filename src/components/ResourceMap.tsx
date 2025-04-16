import { useRef, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [hoveredResource, setHoveredResource] = useState<any>(null);
  const [scale, setScale] = useState(1);
  const [awsLogos, setAwsLogos] = useState<Record<string, HTMLImageElement>>({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState([1]);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

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
      });
    });
    
    setResourcePositions(positions);
  }, [data]);

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
  }, [data, resourcePositions, visibleResources, awsLogos, pan, zoomLevel]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data || isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x * zoomLevel[0]) / zoomLevel[0];
    const y = (e.clientY - rect.top - pan.y * zoomLevel[0]) / zoomLevel[0];
    
    for (const [key, pos] of Object.entries(resourcePositions)) {
      const [type, id] = key.split('-');
      if (!visibleResources.includes(type)) continue;
      
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
      
      hideTooltip();
      return;
    }
    
    let foundResource = false;
    for (const [key, pos] of Object.entries(resourcePositions)) {
      const [type, id] = key.split('-');
      if (!visibleResources.includes(type)) continue;
      
      const { x: posX, y: posY, width, height } = pos as any;
      if (x >= posX && x <= posX + width && y >= posY && y <= posY + height) {
        let resource;
        switch (type) {
          case 'vpc':
            resource = data.vpcs.find((vpc: any) => vpc.id === id);
            if (resource) {
              const tooltipContent = generateResourceTooltip({
                ...resource,
                type
              });
              showTooltip(tooltipContent, e.clientX, e.clientY - 10);
              foundResource = true;
            }
            break;
          case 'subnet':
            resource = data.vpcs.flatMap((vpc: any) => vpc.subnets).find((subnet: any) => subnet.id === id);
            if (resource) {
              const tooltipContent = generateResourceTooltip({
                ...resource,
                type
              });
              showTooltip(tooltipContent, e.clientX, e.clientY - 10);
              foundResource = true;
            }
            break;
          case 'ec2':
            resource = data.ec2Instances.find((ec2: any) => ec2.id === id);
            if (resource) {
              const tooltipContent = generateResourceTooltip({
                ...resource,
                type
              });
              showTooltip(tooltipContent, e.clientX, e.clientY - 10);
              foundResource = true;
            }
            break;
          case 'rds':
            resource = data.rdsInstances.find((rds: any) => rds.id === id);
            if (resource) {
              const tooltipContent = generateResourceTooltip({
                ...resource,
                type
              });
              showTooltip(tooltipContent, e.clientX, e.clientY - 10);
              foundResource = true;
            }
            break;
          case 'igw':
            resource = data.vpcs
              .filter((vpc: any) => vpc.internetGateway)
              .map((vpc: any) => vpc.internetGateway)
              .find((igw: any) => igw.id === id);
            if (resource) {
              const tooltipContent = generateResourceTooltip({
                ...resource,
                type
              });
              showTooltip(tooltipContent, e.clientX, e.clientY - 10);
              foundResource = true;
            }
            break;
        }
        if (foundResource) break;
      }
    }
    
    if (!foundResource) {
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
            const tooltipContent = generateConnectionTooltip({
              ...connection,
              source,
              target
            });
            showTooltip(tooltipContent, e.clientX, e.clientY - 10);
            foundConnection = true;
            break;
          }
        }
      }
      
      if (!foundConnection) {
        hideTooltip();
      }
    }
  };

  const generateResourceTooltip = (resource: any) => {
    if (!resource) return '';
    
    let html = '';
    
    switch (resource.type) {
      case 'vpc':
        html = `
          <div class="space-y-2">
            <div class="font-medium">${resource.name || ''}</div>
            <div class="text-sm">ID: ${resource.id || ''}</div>
            <div class="text-sm">CIDR: ${resource.cidr || ''}</div>
            <div class="text-sm">Subnets: ${resource.subnetCount || '0'}</div>
            <div class="text-sm">Instances: ${resource.instanceCount || '0'}</div>
            <div class="text-sm">State: ${resource.state || ''}</div>
          </div>
        `;
        break;
      case 'subnet':
        html = `
          <div class="space-y-2">
            <div class="font-medium">${resource.name || ''}</div>
            <div class="text-sm">ID: ${resource.id || ''}</div>
            <div class="text-sm">CIDR: ${resource.cidr || ''}</div>
            <div class="text-sm">AZ: ${resource.az || ''}</div>
            <div class="text-sm">Type: ${resource.isPublic ? 'Public' : 'Private'}</div>
            <div class="text-sm">EC2: ${resource.ec2Count || '0'} instances</div>
            <div class="text-sm">RDS: ${resource.rdsCount || '0'} instances</div>
          </div>
        `;
        break;
      case 'ec2':
        html = `
          <div class="space-y-2">
            <div class="font-medium">${resource.name || resource.id || ''}</div>
            <div class="text-sm">ID: ${resource.id || ''}</div>
            <div class="text-sm">Type: ${resource.instanceType || ''}</div>
            <div class="text-sm">State: ${resource.state || ''}</div>
            <div class="text-sm">IP: ${resource.privateIp || ''}</div>
            ${resource.publicIp ? `<div class="text-sm">Public IP: ${resource.publicIp}</div>` : ''}
            <div class="text-sm">Security Groups: ${resource.securityGroups?.length || 0}</div>
          </div>
        `;
        break;
      case 'rds':
        html = `
          <div class="space-y-2">
            <div class="font-medium">${resource.id || ''}</div>
            ${resource.dbName ? `<div class="text-sm">DB Name: ${resource.dbName}</div>` : ''}
            <div class="text-sm">Engine: ${resource.engine || ''} ${resource.engineVersion || ''}</div>
            <div class="text-sm">Status: ${resource.status || ''}</div>
            <div class="text-sm">Endpoint: ${resource.endpoint || ''}</div>
            <div class="text-sm">Port: ${resource.port || ''}</div>
            <div class="text-sm">Security Groups: ${resource.securityGroups?.length || 0}</div>
          </div>
        `;
        break;
      case 'igw':
        html = `
          <div class="space-y-2">
            <div class="font-medium">Internet Gateway</div>
            <div class="text-sm">ID: ${resource.id || ''}</div>
            <div class="text-sm">State: ${resource.state || ''}</div>
            <div class="text-sm">VPC: ${resource.vpcName || ''}</div>
          </div>
        `;
        break;
      default:
        html = `<div>No details available</div>`;
    }
    
    return html;
  };

  const generateConnectionTooltip = (connection: any) => {
    if (!connection) return '';
    
    return `
      <div class="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-md border border-red-200 dark:border-red-800 max-w-xs">
        <div class="flex items-start space-x-2">
          <div>
            <div class="font-medium">Connection Blocked</div>
            <div class="text-sm mt-1">${connection.errorMessage || 'Security group rules blocking traffic'}</div>
            <div class="text-xs mt-2">
              From: ${connection.source?.name || connection.source?.id || ''}<br />
              To: ${connection.target?.id || ''}
            </div>
          </div>
        </div>
      </div>
    `;
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
    
    hideTooltip();
  };

  const handleMouseUp = () => {
    if (!canvasRef.current) return;
    
    setIsDragging(false);
    canvasRef.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => {
    if (!canvasRef.current) return;
    
    setIsDragging(false);
    canvasRef.current.style.cursor = 'grab';
    
    hideTooltip();
    
    setHoveredResource(null);
    setHoveredConnection(null);
    
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
  };

  const handleZoomChange = (newZoom: number[]) => {
    setZoomLevel(newZoom);
    
    hideTooltip();
  };

  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoomLevel([1]);
    
    hideTooltip();
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
    <TooltipProvider>
      <div className="relative w-full h-full overflow-hidden" ref={containerRef}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="cursor-grab"
        />
        
        <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
          <Button variant="outline" size="sm" onClick={handleResetView}>
            Reset View
          </Button>
          <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-md">
            <Slider
              value={zoomLevel}
              onValueChange={handleZoomChange}
              min={0.5}
              max={2}
              step={0.1}
              className="w-32"
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
