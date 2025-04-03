
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Ban, Check, UserX } from "lucide-react";
import { deleteWallpaper } from "@/utils/wallpaper-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const CreatorDetail = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [wallpapers, setWallpapers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetchCreatorDetails();
  }, [creatorId]);

  const fetchCreatorDetails = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching creator details for ID:", creatorId);
      
      const { data: creatorData, error: creatorError } = await supabase
        .from('admin_users')
        .select(`
          *,
          profile:users(
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

      console.log("Creator data received:", creatorData);

      const formattedCreator = {
        ...creatorData,
        username: creatorData.profile?.creator_code || 'No creator code',
        email: creatorData.profile?.email || creatorData.email
      };

      setCreator(formattedCreator);
      setIsBlocked(formattedCreator?.is_blocked || false);
      setNewEmail(formattedCreator.email || '');

      console.log("Looking for wallpapers with user_id:", creatorData.user_id);
      
      const { data: wallpapersData, error: wallpapersError } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('uploaded_by', creatorData.user_id);

      if (wallpapersError) {
        console.error("Error fetching wallpapers:", wallpapersError);
        throw wallpapersError;
      }

      console.log("Wallpapers found:", wallpapersData?.length || 0);
      setWallpapers(wallpapersData || []);
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
  };

  const handleBlockCreator = async () => {
    setIsLoading(true);
    try {
      console.log("Updating block status for creator:", creatorId);
      
      const { error } = await supabase
        .from('admin_users')
        .update({ is_blocked: !isBlocked })
        .eq('id', creatorId);

      if (error) {
        console.error("Error updating block status:", error);
        throw error;
      }

      setIsBlocked(!isBlocked);
      setCreator({ ...creator, is_blocked: !isBlocked });
      toast({
        title: "Success",
        description: `Creator ${isBlocked ? 'unblocked' : 'blocked'} successfully`,
      });
    } catch (error) {
      console.error("Error updating creator status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update creator status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    setIsLoading(true);
    try {
      console.log("Updating email for creator:", creatorId);
      
      const { error } = await supabase
        .from('admin_users')
        .update({ email: newEmail })
        .eq('id', creatorId);

      if (error) {
        console.error("Error updating email:", error);
        throw error;
      }

      setCreator({ ...creator, email: newEmail });
      toast({
        title: "Success",
        description: "Creator email updated successfully",
      });
    } catch (error) {
      console.error("Error updating creator email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update creator email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWallpaperDelete = async (wallpaperId) => {
    if (!wallpaperId) {
      console.error("No wallpaper ID provided for deletion");
      toast({
        title: "Error",
        description: "Invalid wallpaper ID.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("Starting wallpaper deletion for:", wallpaperId);
      
      const deleteToast = toast({
        title: "Deleting...",
        description: "Please wait while we delete this wallpaper.",
      });
      
      const success = await deleteWallpaper(wallpaperId);
      
      if (success) {
        toast({
          title: "Success",
          description: "The wallpaper has been successfully deleted.",
        });
        
        // Update local state to remove the deleted wallpaper
        setWallpapers(prevWallpapers => {
          return prevWallpapers.filter(w => w.id !== wallpaperId);
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete the wallpaper. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in wallpaper deletion:", error);
      toast({
        title: "Error",
        description: error?.message || "An unexpected error occurred during deletion.",
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

  if (!creator) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>Creator Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested creator could not be found.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/admin-manager')}>
              Back to Admin Manager
            </Button>
          </CardContent>
        </Card>
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Creator Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label>Username / Creator Code</Label>
              <p className="font-semibold">{creator.username}</p>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email"
                  disabled={isLoading}
                />
                <Button 
                  size="sm" 
                  onClick={handleChangeEmail} 
                  disabled={isLoading}
                >
                  Change Email
                </Button>
              </div>
            </div>
            <div>
              <Label>Account Status</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant={isBlocked ? "ghost" : "destructive"}
                  onClick={handleBlockCreator}
                  disabled={isLoading}
                >
                  {isBlocked ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Unblock Creator
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Block Creator
                    </>
                  )}
                </Button>
                {isBlocked && (
                  <p className="text-red-500">This account is currently blocked.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Wallpapers by this Creator</h2>
        {wallpapers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Preview</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallpapers.map((wallpaper) => (
                <TableRow key={wallpaper.id}>
                  <TableCell className="w-24">
                    <div className="w-20 h-20 rounded overflow-hidden">
                      <AspectRatio ratio={3/4}>
                        <img 
                          src={wallpaper.compressed_url} 
                          alt={`Wallpaper ${wallpaper.id}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      </AspectRatio>
                    </div>
                  </TableCell>
                  <TableCell>{wallpaper.id}</TableCell>
                  <TableCell>{wallpaper.type || 'Unknown'}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isLoading}>
                          <UserX className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this wallpaper from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleWallpaperDelete(wallpaper.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Card>
            <CardContent className="py-4">
              <p>No wallpapers found for this creator.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreatorDetail;
