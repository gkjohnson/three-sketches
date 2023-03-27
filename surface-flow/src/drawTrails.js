import { GreaterDepth, LessEqualDepth } from 'three';

export function drawTrails( renderer, camera, mask, trails ) {

	trails.material.depthFunc = GreaterDepth;
	mask.material.colorWrite = false;
	renderer.render( mask, camera );
	renderer.render( trails, camera );

	trails.material.depthFunc = LessEqualDepth;
	mask.material.colorWrite = true;
	renderer.render( mask, camera );
	renderer.render( trails, camera );

}
