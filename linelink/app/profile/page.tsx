'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormLabel from '@/components/ui/FormLabel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserProfile {
  id?: string;
  name?: string | null;
  email?: string | null;
  company?: string;
}

export default function ProfilePage() {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    company: '',
  });

//   useEffect(() => {
//     setIsMounted(true);
    
//     if (session?.user) {
//       setProfile({
//         id: session.user.id || '',
//         name: session.user.name || '',
//         email: session.user.email || '',
//         company: session.user.company || '',
//       });
//       setIsLoading(false);
//     }
//   }, [session]);

  if (!isMounted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.company || !profile.company.trim()) {
      toast.error('Company name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${profile.id}/company`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company: profile.company }),
      });

      if (!response.ok) {
        throw new Error('Failed to update company');
      }

      // Update the session with the new company
      await update({
        ...session,
        user: {
          ...session?.user,
          company: profile.company,
        },
      });

      toast.success('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your profile information and company details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <FormLabel htmlFor="name">Name</FormLabel>
              <Input 
                id="name" 
                value={profile.name || ''} 
                disabled 
                className="bg-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <FormLabel htmlFor="email">Email</FormLabel>
              <Input 
                id="email" 
                type="email" 
                value={profile.email || ''} 
                disabled 
                className="bg-gray-100"
              />
            </div>
            
            <div className="space-y-2">
              <FormLabel htmlFor="company">Company</FormLabel>
              <Input 
                id="company" 
                value={profile.company} 
                onChange={(e) => setProfile({...profile, company: e.target.value})}
                placeholder="Enter your company name"
                required
              />
            </div>
            
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
