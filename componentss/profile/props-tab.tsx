"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Package, Eye, Edit, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/componentss/ui/button";
import { Card, CardContent } from "@/componentss/ui/card";
import { Badge } from "@/componentss/ui/badge";
import { useUserProps, useDeleteUserProp } from "@/hooks/use-props-queries";

export default function PropsTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: propsData, isLoading } = useUserProps(100, 0);
  const deletePropMutation = useDeleteUserProp();

  const userRoles = (session?.user as any)?.roles || [];
  const canListProps = userRoles.includes('prop_lister') || userRoles.includes('admin') || userRoles.includes('founder');
  const props = propsData?.props || [];

  const handleDeleteProp = async (propId: string) => {
    if (!confirm("Are you sure you want to delete this prop?")) return;
    deletePropMutation.mutate(propId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col mb-4 items-start justify-between sm:flex-row md:flex-row">
        <h2 className="text-2xl font-bold mb-4 md:mb-0 sm:mb-0">My Props</h2>
        {canListProps && (
          <Button
            onClick={() => router.push("/props/submit")}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Prop
          </Button>
        )}
      </div>

      {!canListProps ? (
        <Card className="bg-gray-800/30 border-orange-500/20">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Permission Required</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              You need the <span className="text-orange-400 font-semibold">Prop Lister</span> role to sell 3D models and props on FiveCrux.
            </p>
            <Button 
              variant="outline" 
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
              onClick={() => window.open('https://discord.gg/fivecrux', '_blank')}
            >
              Apply for Role
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : props.length === 0 ? (
        <Card className="bg-gray-800/30 border-gray-700/50">
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">You haven't listed any props yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {props.map((prop: any) => (
            <Card
              key={prop.id}
              className="bg-gray-800/30 border-gray-700/50 hover:border-orange-500/50 transition-colors"
            >
              <CardContent className="p-6">
                <div className="aspect-video bg-gray-700 rounded-lg mb-4 overflow-hidden relative">
                  {prop.images && prop.images.length > 0 ? (
                    <img
                      src={prop.images[0]}
                      alt={prop.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-500" />
                    </div>
                  )}
                  {parseFloat(prop.discountPercentage) > 0 && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white border-none">
                      -{prop.discountPercentage}%
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg break-words">
                      {prop.name}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 break-words">
                      {prop.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">
                        <span className="text-orange-500">{prop.currencySymbol || prop.currency_symbol || "€"}</span> {prop.discountedPrice || prop.price}
                      </span>
                      {prop.discountedPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          {prop.currencySymbol || prop.currency_symbol || "€"}{prop.price}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => router.push(`/props/${prop.id}`)}
                      className="flex-1 md:flex-initial min-w-0"
                    >
                      <Eye className="h-4 w-4 mr-1 md:mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => router.push(`/props/submit?edit=${prop.id}`)}
                      className="flex-1 md:flex-initial min-w-0"
                    >
                      <Edit className="h-4 w-4 mr-1 md:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => handleDeleteProp(prop.id)}
                      className="flex-1 md:flex-initial min-w-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
