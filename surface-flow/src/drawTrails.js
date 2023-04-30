import { GreaterDepth, LessEqualDepth } from 'three';

export function drawTrails( renderer, camera, mask, meshes ) {

	if ( ! Array.isArray( meshes ) ) meshes = [ meshes ];

	meshes.forEach( mesh => mesh.material.depthFunc = GreaterDepth );
	mask.material.colorWrite = false;
	renderer.render( mask, camera );
	meshes.forEach( mesh => renderer.render( mesh, camera ) );

	meshes.forEach( meshes => meshes.material.depthFunc = LessEqualDepth );
	mask.material.colorWrite = true;
	renderer.render( mask, camera );
	meshes.forEach( mesh => renderer.render( mesh, camera ) );

}
