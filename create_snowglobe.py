#!/usr/bin/env python3
"""
Create a USDZ snowglobe from an STL file with transparent glass and snow particles.
"""

import os
import numpy as np
from pxr import Usd, UsdGeom, UsdShade, Sdf, Gf
import trimesh

def create_snowglobe_usdz(stl_path, output_path):
    """Create a USDZ snowglobe with transparent glass and snow."""
    
    # Create a new USD stage
    stage = Usd.Stage.CreateNew(output_path.replace('.usdz', '.usda'))
    root_prim = stage.GetRootLayer()
    
    # Define the stage up axis and units
    UsdGeom.SetStageUpAxis(stage, "Y")
    UsdGeom.SetStageMetersPerUnit(stage, 1.0)
    
    # Create root Xform for the snowglobe
    snowglobe = UsdGeom.Xform.Define(stage, "/Snowglobe")
    
    # Load the STL file to get its bounding box
    print(f"Loading STL file: {stl_path}")
    loaded = trimesh.load(stl_path)
    
    # Handle Scene vs Mesh
    if isinstance(loaded, trimesh.Scene):
        # Get the first mesh from the scene
        mesh = list(loaded.geometry.values())[0]
    else:
        mesh = loaded
    
    # Ensure we have vertices and faces
    if not hasattr(mesh, 'vertices') or not hasattr(mesh, 'faces'):
        raise ValueError("STL file does not contain valid mesh data")
    
    # Get bounding box and center
    bounds = mesh.bounds
    center = mesh.centroid
    size = bounds[1] - bounds[0]
    max_dim = max(size)
    
    # Center the mesh at origin
    mesh_centered = mesh.copy()
    mesh_centered.apply_translation(-center)
    
    # Create the glass globe from the STL shape itself
    glass_prim = UsdGeom.Xform.Define(stage, "/Snowglobe/Glass")
    glass_mesh = UsdGeom.Mesh.Define(stage, "/Snowglobe/Glass/Mesh")
    
    # Convert vertices and faces to USD
    points = glass_mesh.CreatePointsAttr()
    points.Set([Gf.Vec3f(v[0], v[1], v[2]) for v in mesh_centered.vertices])
    
    face_vertex_counts = glass_mesh.CreateFaceVertexCountsAttr()
    face_vertex_indices = glass_mesh.CreateFaceVertexIndicesAttr()
    
    # Handle different mesh face formats
    if isinstance(mesh_centered.faces, np.ndarray):
        # Numpy array of faces
        counts = [3] * len(mesh_centered.faces)
        indices = mesh_centered.faces.flatten().astype(int).tolist()
    else:
        # List of face lists
        counts = [len(f) for f in mesh_centered.faces]
        indices = [int(idx) for face in mesh_centered.faces for idx in face]
    
    face_vertex_counts.Set(counts)
    face_vertex_indices.Set(indices)
    
    # Create transparent glass material for the STL shape
    glass_material = UsdShade.Material.Define(stage, "/Snowglobe/Glass/Material")
    glass_shader = UsdShade.Shader.Define(stage, "/Snowglobe/Glass/Material/GlassShader")
    glass_shader.CreateIdAttr("UsdPreviewSurface")
    glass_shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(0.9, 0.9, 0.95))
    glass_shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(0.0)
    glass_shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(0.05)
    glass_shader.CreateInput("ior", Sdf.ValueTypeNames.Float).Set(1.5)  # Glass IOR
    glass_shader.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(0.15)  # Transparent but visible
    glass_shader.CreateInput("transmissionColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(0.95, 0.95, 1.0))
    
    glass_material.CreateSurfaceOutput().ConnectToSource(glass_shader.ConnectableAPI(), "surface")
    UsdShade.MaterialBindingAPI(glass_mesh).Bind(glass_material)
    
    # Save the USD file
    print(f"Saving USD stage to: {output_path.replace('.usdz', '.usda')}")
    stage.GetRootLayer().Save()
    
    # Create USDZ (zip file)
    import zipfile
    import shutil
    
    usda_path = output_path.replace('.usdz', '.usda')
    if os.path.exists(output_path):
        os.remove(output_path)
    
    print(f"Creating USDZ file: {output_path}")
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(usda_path, os.path.basename(usda_path))
    
    # Clean up the temporary USDA file
    # os.remove(usda_path)
    
    print(f"Successfully created USDZ snowglobe: {output_path}")

if __name__ == "__main__":
    # Create output directory if it doesn't exist
    output_dir = "usda"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory: {output_dir}")
    
    # Find all STL files in the current directory
    stl_files = [f for f in os.listdir(".") if f.endswith(".stl")]
    
    if not stl_files:
        print("Error: No STL files found in the current directory!")
        exit(1)
    
    print(f"Found {len(stl_files)} STL file(s) to process:")
    for stl_file in stl_files:
        print(f"  - {stl_file}")
    
    # Process each STL file
    for stl_file in stl_files:
        base_name = os.path.splitext(stl_file)[0]
        output_file = os.path.join(output_dir, f"{base_name}_snowglobe.usdz")
        
        print(f"\nProcessing: {stl_file}")
        try:
            create_snowglobe_usdz(stl_file, output_file)
        except Exception as e:
            print(f"Error processing {stl_file}: {e}")
            continue
    
    print(f"\nAll files processed. Output saved to '{output_dir}' directory.")

