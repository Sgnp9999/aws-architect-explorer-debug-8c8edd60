
import { useState } from "react";
import { Credentials } from "@/components/Credentials";
import { ArchitectureView } from "@/components/ArchitectureView";

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState<{
    accessKey: string;
    secretKey: string;
    region: string;
  } | null>(null);

  const handleCredentialsSubmit = (creds: {
    accessKey: string;
    secretKey: string;
    region: string;
  }) => {
    setCredentials(creds);
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthenticated ? (
        <Credentials onSubmit={handleCredentialsSubmit} />
      ) : (
        <ArchitectureView credentials={credentials!} />
      )}
    </div>
  );
};

export default Index;
