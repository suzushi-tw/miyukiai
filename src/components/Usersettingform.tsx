"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Save, Camera, X, Clock, ExternalLink, Plus, Trash } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"

// Import the icons
import { 
  SimpleIconsX, 
  SimpleIconsHuggingface, 
  CibKoFi, 
  LineMdBuyMeACoffeeTwotone 
} from "@/lib/icon"

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  image: z.string().optional(),
})

const socialLinkFormSchema = z.object({
  platform: z.string().min(1, {
    message: "Platform name is required.",
  }),
  icon: z.string().min(1, {
    message: "Please select an icon.",
  }),
  url: z.string().url({
    message: "Please enter a valid URL.",
  }),
})

// Available platform options with icons
const platformOptions = [
  { value: "twitter", label: "Twitter", icon: "SimpleIconsX" },
  { value: "huggingface", label: "Hugging Face", icon: "SimpleIconsHuggingface" },
  { value: "kofi", label: "Ko-fi", icon: "CibKoFi" },
  { value: "buymeacoffee", label: "Buy Me A Coffee", icon: "LineMdBuyMeACoffeeTwotone" }
];

type ProfileFormValues = z.infer<typeof profileFormSchema>
type SocialLinkFormValues = z.infer<typeof socialLinkFormSchema>

// Types for social links
interface SocialLink {
  id: string;
  platform: string;
  icon: string;
  url: string;
}

// Function to render icon by name
function IconByName({ name, ...props }: { name: string } & React.SVGProps<SVGSVGElement>) {
  switch (name) {
    case "SimpleIconsX":
      return <SimpleIconsX {...props} />;
    case "SimpleIconsHuggingface":
      return <SimpleIconsHuggingface {...props} />;
    case "CibKoFi":
      return <CibKoFi {...props} />;
    case "LineMdBuyMeACoffeeTwotone":
      return <LineMdBuyMeACoffeeTwotone {...props} />;
    default:
      return null;
  }
}

// Function to upload file to S3 using your existing API
const uploadImageToS3 = async (file: File): Promise<string> => {
  try {
    const response = await fetch('/api/s3url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentType: file.type,
        folder: 'profile', // Using 'profile' prefix for profile images
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }

    const { presignedUrl, fileUrl } = await response.json();

    // Upload to S3
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }

    return fileUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export function UserSettingsForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSocialLoading, setIsSocialLoading] = useState<boolean>(false)
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Social links state
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [isAddingLink, setIsAddingLink] = useState(false)
  
  const [session, setSession] = useState<{
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image?: string | null;
    };
  } | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const { data } = await authClient.getSession();
        setSession(data);
      } catch (error) {
        console.error("Failed to fetch session:", error);
        toast.error("Failed to load user data");
      } finally {
        setIsSessionLoading(false);
      }
    }
    
    fetchSession();
  }, []);

  // Fetch social links
  useEffect(() => {
    async function fetchSocialLinks() {
      if (!session?.user) return;
      
      try {
        const response = await fetch('/api/social-links');
        if (response.ok) {
          const data = await response.json();
          setSocialLinks(data);
        }
      } catch (error) {
        console.error("Failed to fetch social links:", error);
      }
    }
    
    fetchSocialLinks();
  }, [session]);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      image: "",
    },
  })

  // Social link form
  const socialLinkForm = useForm<SocialLinkFormValues>({
    resolver: zodResolver(socialLinkFormSchema),
    defaultValues: {
      platform: "",
      icon: "",
      url: "",
    },
  })

  // Update platform icon when platform is selected
  useEffect(() => {
    const platform = socialLinkForm.watch("platform");
    if (platform) {
      const selectedPlatform = platformOptions.find(p => p.value === platform);
      if (selectedPlatform) {
        socialLinkForm.setValue("icon", selectedPlatform.icon);
      }
    }
  }, [socialLinkForm.watch("platform")]);

  // Update form values when session data is loaded
  useEffect(() => {
    if (session?.user) {
      profileForm.reset({
        name: session.user.name || "",
        image: session.user.image || "",
      });
      
      // Set image preview if user has an image
      if (session.user.image) {
        setImagePreview(session.user.image);
      }
    }
  }, [session, profileForm]);

  // Handle file selection for profile image
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please select a valid image file (JPEG, PNG, GIF, or WEBP)"
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Image size must be less than 5MB"
      });
      return;
    }
    
    try {
      setIsImageUploading(true);
      
      // Create local preview
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      
      // Upload to S3
      const uploadedUrl = await uploadImageToS3(file);
      
      // Update form value with the uploaded URL
      profileForm.setValue('image', uploadedUrl);
      
      toast.success("Image uploaded", {
        description: "Click 'Save Changes' to update your profile"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Failed to upload image", {
        description: "Please try again or use a different image"
      });
      
      // Revert to previous image if available
      setImagePreview(session?.user?.image || null);
    } finally {
      setIsImageUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove current image preview
  const handleRemoveImage = () => {
    setImagePreview(null);
    profileForm.setValue('image', '');
  };

  async function onProfileSubmit(data: ProfileFormValues) {
    setIsLoading(true)
    try {
      await authClient.updateUser({
        name: data.name,
        image: data.image || "",
      })
      toast.success("Profile updated", {
        description: "Your profile information has been updated successfully."
      })
      router.refresh()
    } catch (error) {
      console.error("Profile update error:", error)
      toast.error("Error", {
        description: "Something went wrong. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle adding a new social link
  const onSocialLinkSubmit = async (data: SocialLinkFormValues) => {
    setIsSocialLoading(true);
    try {
      const response = await fetch('/api/social-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: data.platform,
          icon: data.icon,
          url: data.url
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add social link');
      }

      const newLink = await response.json();
      setSocialLinks([...socialLinks, newLink]);
      setIsAddingLink(false);
      socialLinkForm.reset();
      
      toast.success("Link added", {
        description: `Your ${platformOptions.find(p => p.value === data.platform)?.label || data.platform} profile has been linked.`
      });
    } catch (error) {
      console.error("Failed to add social link:", error);
      toast.error("Failed to add link", {
        description: "Please try again."
      });
    } finally {
      setIsSocialLoading(false);
    }
  };

  const removeLink = async (id: string) => {
    try {
      // Use query parameter instead of path parameter
      const response = await fetch(`/api/social-links?id=${id}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) {
        throw new Error('Failed to remove social link');
      }
  
      setSocialLinks(socialLinks.filter(link => link.id !== id));
      
      toast.success("Link removed", {
        description: "The social profile has been unlinked."
      });
    } catch (error) {
      console.error("Failed to remove social link:", error);
      toast.error("Failed to remove link", {
        description: "Please try again."
      });
    }
  };

  // Show loading state while session is being fetched
  if (isSessionLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no session, show login message
  if (!session) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-2">Not Logged In</h2>
        <p className="text-muted-foreground mb-6">Please log in to access your account settings</p>
        <Button onClick={() => router.push("/login")}>
          Log In
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="account">Connected Accounts</TabsTrigger>
      </TabsList>

      {/* Profile tab content */}
      <TabsContent value="profile" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your profile information and how others see you on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Profile avatar and info */}
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6 mb-6">
              <div className="relative mb-4 sm:mb-0">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={imagePreview || session.user.image || "/placeholder.svg"} 
                      alt={session.user.name}
                    />
                    <AvatarFallback className="text-xl">{session.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  
                  {/* Image upload button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-white"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImageUploading}
                    >
                      {isImageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                
                {/* Remove image button */}
                {imagePreview && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveImage}
                    disabled={isImageUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  disabled={isImageUploading}
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium">{session.user.name}</h3>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click on your profile picture to upload a new image
                </p>
              </div>
            </div>

            {/* Profile form */}
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormDescription>This is your public display name.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Image URL is now handled by the upload UI */}
                <input type="hidden" {...profileForm.register("image")} />
                
                <Button type="submit" disabled={isLoading || isImageUploading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Connected Accounts tab */}
      <TabsContent value="account" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Link your accounts from other platforms to enhance your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {socialLinks.length > 0 ? (
              <div className="space-y-4 mb-6">
                {socialLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        <IconByName name={link.icon} />
                      </div>
                      <div>
                        <div className="font-medium">
                          {platformOptions.find(p => p.value === link.platform)?.label || link.platform}
                        </div>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground flex items-center hover:underline"
                        >
                          {link.url.replace(/^https?:\/\//, "")}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeLink(link.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>You haven&apos;t linked any external profiles yet.</p>
                <p className="text-sm mt-1">Add your profiles from platforms like Hugging Face, Twitter, Ko-fi, etc.</p>
              </div>
            )}

            {!isAddingLink ? (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setIsAddingLink(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add External Profile
              </Button>
            ) : (
              <Card className="border-dashed mt-4">
                <CardContent className="pt-4">
                  <Form {...socialLinkForm}>
                    <form onSubmit={socialLinkForm.handleSubmit(onSocialLinkSubmit)} className="space-y-4">
                      <FormField
                        control={socialLinkForm.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Platform</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {platformOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <IconByName name={option.icon} className="h-4 w-4" />
                                      <span>{option.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={socialLinkForm.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Hidden icon field is set automatically based on platform */}
                      <input type="hidden" {...socialLinkForm.register("icon")} />
                      
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddingLink(false)}
                          disabled={isSocialLoading}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSocialLoading}>
                          {isSocialLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Link"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Why connect accounts?</h3>
              <p className="text-sm text-muted-foreground">
                Connecting your public profiles helps others discover your work across platforms
                and establishes your identity within the community.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}