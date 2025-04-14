import { useRef, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Network, Shield, Server, Database, Globe, AlertTriangle, Layers } from "lucide-react";

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
      x: x * scale + rect.left,
      y: y * scale + rect.top
    };
  };

  useEffect(() => {
    if (!data) return;
    
    const positions: any = {};
    
    const vpcsCount = data.vpcs.length;
    const vpcsPerRow = Math.ceil(Math.sqrt(vpcsCount));
    const vpcWidth = 900;
    const vpcHeight = 700;
    const vpcSpacing = 200;
    
    data.vpcs.forEach((vpc: any, vpcIndex: number) => {
      const vpcX = (vpcIndex % vpcsPerRow) * (vpcWidth + vpcSpacing) + 150;
      const vpcY = Math.floor(vpcIndex / vpcsPerRow) * (vpcHeight + vpcSpacing) + 150;
      
      positions[`vpc-${vpc.id}`] = { x: vpcX, y: vpcY, width: vpcWidth, height: vpcHeight };
      
      if (vpc.internetGateway) {
        positions[`igw-${vpc.internetGateway.id}`] = {
          x: vpcX + vpcWidth / 2,
          y: vpcY - 80,
          width: 50,
          height: 50
        };
      }
      
      const subnetsPerRow = Math.ceil(Math.sqrt(vpc.subnets.length));
      const subnetWidth = (vpcWidth - 80) / subnetsPerRow;
      const subnetHeight = (vpcHeight - 120) / Math.ceil(vpc.subnets.length / subnetsPerRow);
      
      vpc.subnets.forEach((subnet: any, subnetIndex: number) => {
        const subnetX = vpcX + 40 + (subnetIndex % subnetsPerRow) * subnetWidth;
        const subnetY = vpcY + 80 + Math.floor(subnetIndex / subnetsPerRow) * subnetHeight;
        
        positions[`subnet-${subnet.id}`] = {
          x: subnetX,
          y: subnetY,
          width: subnetWidth - 20,
          height: subnetHeight - 20
        };
        
        const instances = data.ec2Instances.filter((ec2: any) => ec2.subnetId === subnet.id);
        const instancesPerRow = Math.ceil(Math.sqrt(instances.length));
        const instanceWidth = 40;
        const instanceHeight = 40;
        const instanceSpacing = 25;
        
        instances.forEach((instance: any, instanceIndex: number) => {
          const instanceX = subnetX + 30 + (instanceIndex % instancesPerRow) * (instanceWidth + instanceSpacing);
          const instanceY = subnetY + 60 + Math.floor(instanceIndex / instancesPerRow) * (instanceHeight + instanceSpacing);
          
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
        const rdsWidth = 40;
        const rdsHeight = 40;
        const rdsSpacing = 25;
        
        rdsInstances.forEach((rds: any, rdsIndex: number) => {
          const rdsX = subnetX + subnetWidth - 80 - (rdsIndex % rdsPerRow) * (rdsWidth + rdsSpacing);
          const rdsY = subnetY + subnetHeight - 80 - Math.floor(rdsIndex / rdsPerRow) * (rdsHeight + rdsSpacing);
          
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
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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
          ctx.drawImage(awsLogos.vpc, pos.x + 10, pos.y + 10, 28, 28);
        }
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`VPC: ${vpc.name}`, pos.x + 50, pos.y + 25);
        ctx.font = '14px Arial';
        ctx.fillText(`CIDR: ${vpc.cidr}`, pos.x + 15, pos.y + 55);
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
          ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          if (awsLogos.igw) {
            ctx.drawImage(awsLogos.igw, pos.x - 18, pos.y - 18, 36, 36);
          }
          
          ctx.fillStyle = '#000';
          ctx.font = '12px Arial';
          ctx.fillText('IGW', pos.x - 12, pos.y + 40);
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
            ctx.drawImage(awsLogos.subnet, pos.x + 8, pos.y + 8, 18, 18);
          }
          
          ctx.fillStyle = '#000';
          ctx.font = 'bold 14px Arial';
          ctx.fillText(`Subnet: ${subnet.name.substring(0, 15)}`, pos.x + 30, pos.y + 20);
          ctx.font = '12px Arial';
          ctx.fillText(`CIDR: ${subnet.cidr}`, pos.x + 10, pos.y + 40);
          ctx.fillText(`${isPublic ? 'Public' : 'Private'}`, pos.x + 10, pos.y + 60);
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
            ctx.drawImage(awsLogos.sg, pos.x - 10, pos.y - 10, 15, 15);
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
        ctx.font = '10px Arial';
        const instanceIdText = ec2.instanceId && typeof ec2.instanceId === 'string' 
          ? ec2.instanceId.split('-').pop() 
          : ec2.id.toString().substring(0, 6);
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
            ctx.drawImage(awsLogos.sg, pos.x - 10, pos.y - 10, 15, 15);
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
        ctx.font = '10px Arial';
        const rdsIdText = rds.id && typeof rds.id === 'string' 
          ? rds.id.split('-').pop() 
          : rds.id.toString().substring(0, 6);
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
  }, [data, resourcePositions, visibleResources, awsLogos]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !data) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
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
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
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
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        className="cursor-pointer"
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
          <Layers className="h-4 w-4 mr-1 text-orange-500" />
          <span>Private Subnet</span>
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
