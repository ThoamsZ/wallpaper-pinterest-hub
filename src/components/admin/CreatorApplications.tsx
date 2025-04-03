
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const CreatorApplications = () => {
  const [creatorApplications, setCreatorApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCreatorApplications();
  }, []);

  const fetchCreatorApplications = async () => {
    setIsLoading(true);
    try {
      const { data: userApplications, error: usersError } = await supabase
        .from('users')
        .select('id, email, creator_code')
        .not('creator_code', 'is', null);

      if (usersError) throw usersError;

      if (!userApplications || userApplications.length === 0) {
        setCreatorApplications([]);
        setIsLoading(false);
        return;
      }

      const userIds = userApplications.map(user => user.id);

      const { data: existingAdmins, error: adminsError } = await supabase
        .from('admin_users')
        .select('user_id')
        .in('user_id', userIds);

      if (adminsError) throw adminsError;

      const existingAdminIds = existingAdmins?.map(admin => admin.user_id) || [];
      const pendingApplications = userApplications.filter(
        user => !existingAdminIds.includes(user.id)
      );

      setCreatorApplications(pendingApplications);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch creator applications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCreator = async (userId: string, email: string) => {
    try {
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: userId,
          admin_type: 'admin',
          email: email
        });

      if (adminError) throw adminError;

      setCreatorApplications(prev => prev.filter(app => app.id !== userId));

      toast({
        title: "Success",
        description: `Creator ${email} approved successfully`,
      });
      
      fetchCreatorApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve creator",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {creatorApplications.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Creator Code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {creatorApplications.map((application) => (
              <TableRow key={application.id}>
                <TableCell>{application.email}</TableCell>
                <TableCell>{application.creator_code}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleApproveCreator(application.id, application.email)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No pending applications.</p>
        </div>
      )}
    </div>
  );
};
