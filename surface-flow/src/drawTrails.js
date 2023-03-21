import { GreaterDepth, LessEqualDepth } from 'three';

export function drawTrails( renderer, camera, mask, trails ) {

	trails.material.depthFunc = GreaterDepth;
	renderer.render( mask, camera );
	renderer.render( trails, camera );

	trails.material.depthFunc = LessEqualDepth;
	renderer.render( mask, camera );
	renderer.render( trails, camera );

}
