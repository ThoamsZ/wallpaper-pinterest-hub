
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

const CreatorDetail = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [creatorInfo, setCreatorInfo] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch creator details
  const fetchCreatorDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching creator details for ID:", creatorId);
      
      const { data: creatorData, error: creatorError } = await supabase
        .from('admin_users')
        .select(`
          *,
          profile:users!inner(
            email,
            creator_code
          )
        `)
        .eq('id', creatorId)
        .single();

      if (creatorError) {
        console.error("Error fetching creator data:", creatorError);
        throw creatorError;
      }

      console.log("Creator data:", creatorData);
      setCreatorInfo(creatorData);
    } catch (error) {
      console.error("Error fetching creator details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch creator details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [creatorId]);

  // Use effect to fetch creator details on mount
  useEffect(() => {
    fetchCreatorDetails();
  }, [fetchCreatorDetails]);

  // Function to handle redirection to the creator's admin panel
  const navigateToCreatorAdminPanel = () => {
    if (creatorInfo?.user_id) {
      setIsRedirecting(true);
      // Store creator info in localStorage for the admin panel to use
      localStorage.setItem('viewing_creator', JSON.stringify({
        id: creatorInfo.user_id,
        email: creatorInfo.profile?.email,
        adminId: creatorInfo.id,
        fullAccess: true  // Add flag to grant deletion privileges
      }));
      
      // Redirect to the creator's admin panel
      navigate('/admin-panel', { state: { 
        viewingCreator: creatorInfo.user_id,
        fullAccess: true  // Add flag to grant deletion privileges
      }});
      toast({
        title: "Redirecting",
        description: "Navigating to creator's admin panel with full access",
      });
    } else {
      toast({
        title: "Error",
        description: "Creator information not available",
        variant: "destructive",
      });
    }
  };

  // Function to toggle creator blocked status
  const toggleBlockStatus = async () => {
    try {
      if (!creatorInfo) return;
      
      const newBlockStatus = !creatorInfo.is_blocked;
      
      const { error } = await supabase
        .from('admin_users')
        .update({ is_blocked: newBlockStatus })
        .eq('id', creatorId);

      if (error) {
        console.error("Error updating block status:", error);
        throw error;
      }

      // Update local state
      setCreatorInfo(prev => ({
        ...prev,
        is_blocked: newBlockStatus
      }));

      toast({
        title: "Success",
        description: `Creator ${newBlockStatus ? 'blocked' : 'unblocked'} successfully`,
      });
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update creator status",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4 flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back to Creators
        </Button>
        <h1 className="text-2xl font-bold">Creator Details</h1>
        <Button 
          variant="primary" 
          onClick={navigateToCreatorAdminPanel}
          disabled={isRedirecting}
        >
          {isRedirecting ? "Redirecting..." : "View Creator Admin Panel (Full Access)"}
        </Button>
      </div>

      {creatorInfo ? (
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex justify-between">
              <div>Creator Information</div>
              {creatorInfo.is_blocked && (
                <span className="text-sm font-normal text-red-500 bg-red-100 px-2 py-1 rounded">Blocked</span>
              )}
            </CardTitle>
            <CardDescription>
              Details about this creator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="font-semibold">{creatorInfo.profile?.email || 'No email available'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Creator Code</p>
                <p className="font-semibold">{creatorInfo.profile?.creator_code || 'No creator code'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Admin Type</p>
                <p className="font-semibold">{creatorInfo.admin_type || 'Not specified'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Created At</p>
                <p className="font-semibold">
                  {creatorInfo.created_at 
                    ? new Date(creatorInfo.created_at).toLocaleString() 
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              variant={creatorInfo.is_blocked ? "outline" : "destructive"} 
              onClick={toggleBlockStatus}
            >
              {creatorInfo.is_blocked ? 'Unblock Creator' : 'Block Creator'}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">Creator information not available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreatorDetail;
