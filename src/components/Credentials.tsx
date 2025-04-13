
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Key, MapPin, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CredentialsProps {
  onSubmit: (credentials: {
    accessKey: string;
    secretKey: string;
    region: string;
  }) => void;
}

export const Credentials = ({ onSubmit }: CredentialsProps) => {
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // In a real application, you'd validate credentials here
    // For this demo, we'll just simulate a brief loading state
    setTimeout(() => {
      onSubmit({ accessKey, secretKey, region });
      setLoading(false);
    }, 1000);
  };

  const regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2", 
    "eu-west-1", "eu-west-2", "eu-central-1", 
    "ap-northeast-1", "ap-northeast-2", "ap-southeast-1", "ap-southeast-2", 
    "sa-east-1"
  ];

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">AWS Architecture Explorer</CardTitle>
          <CardDescription className="text-center">
            Enter your AWS credentials to visualize your infrastructure
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="accessKey">Access Key ID</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">Enter your AWS Access Key ID. We recommend using read-only credentials for security.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Key className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  id="accessKey" 
                  type="text" 
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="pl-8"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="secretKey">Secret Access Key</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-80">Enter your AWS Secret Access Key. Your credentials are never stored permanently.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <Shield className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  id="secretKey" 
                  type="password" 
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className="pl-8"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="region">AWS Region</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select the AWS region where your resources are located.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 z-10" />
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="pl-8">
                    <SelectValue placeholder="Select AWS Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connecting..." : "Visualize AWS Architecture"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
