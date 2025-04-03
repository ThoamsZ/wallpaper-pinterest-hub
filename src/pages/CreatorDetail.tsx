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
      // Fetch creator details
      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select('*')
        .eq('id', creatorId)
        .single();

      if (creatorError) {
        throw creatorError;
      }

      setCreator(creatorData);
      setIsBlocked(creatorData?.is_blocked || false);

      // Fetch wallpapers by creator
      const { data: wallpapersData, error: wallpapersError } = await supabase
        .from('wallpapers')
        .select('*')
        .eq('creator_id', creatorId);

      if (wallpapersError) {
        throw wallpapersError;
      }

      setWallpapers(wallpapersData || []);
    } catch (error: any) {
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
      const { error } = await supabase
        .from('creators')
        .update({ is_blocked: !isBlocked })
        .eq('id', creatorId);

      if (error) {
        throw error;
      }

      setIsBlocked(!isBlocked);
      setCreator({ ...creator, is_blocked: !isBlocked });
      toast({
        title: "Success",
        description: `Creator ${isBlocked ? 'unblocked' : 'blocked'} successfully`,
      });
    } catch (error: any) {
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
      const { error } = await supabase
        .from('creators')
        .update({ email: newEmail })
        .eq('id', creatorId);

      if (error) {
        throw error;
      }

      setCreator({ ...creator, email: newEmail });
      toast({
        title: "Success",
        description: "Creator email updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update creator email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWallpaperDelete = async (wallpaperId: string) => {
    if (!confirm("Are you sure you want to delete this wallpaper? This action cannot be undone.")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await deleteWallpaper(wallpaperId);
      
      if (success) {
        toast({
          title: "Wallpaper Deleted",
          description: "The wallpaper has been successfully deleted.",
        });
        
        // Refresh creator data after deletion
        fetchCreatorDetails();
      } else {
        toast({
          title: "Deletion Failed",
          description: "Failed to delete the wallpaper. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in wallpaper deletion:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              <Label>Username</Label>
              <p className="font-semibold">{creator.username}</p>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="email"
                  type="email"
                  value={newEmail || creator.email}
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
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallpapers.map((wallpaper) => (
                <TableRow key={wallpaper.id}>
                  <TableCell>{wallpaper.id}</TableCell>
                  <TableCell>{wallpaper.name || 'Untitled'}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
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
                          <AlertDialogAction onClick={() => handleWallpaperDelete(wallpaper.id)}>Delete</AlertDialogAction>
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
            <CardContent>
              <p>No wallpapers found for this creator.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreatorDetail;
