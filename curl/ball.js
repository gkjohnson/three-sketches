import { App } from '../common/App.js';
import { MeshBasicMaterial, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { InstancedSpheres } from '../surface-flow/src/InstancedSphere.js';
import { InstancedTrails } from '../surface-flow/src/InstancedTrails.js';
import { CurlGenerator } from './src/CurlGenerator.js';
import { FadeLineMaterial } from '../surface-flow/src/FadeLineMaterial.js';

const POINT_COUNT = 1000;
const SEGMENTS_COUNT = 10000;
const SPEED = 0.005;

function randomSampleSphere() {

	const v = new Vector3();
	do {

		v.random();
		v.x -= 0.5;
		v.y -= 0.5;
		v.z -= 0.5;

	} while ( v.length() > 0.5 );

	return v.multiplyScalar( 2.0 );

}

( async () => {

	const app = new App();
	app.init( document.body );

	const { camera, scene, renderer } = app;
	camera.position.set( 4, 0, - 7 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const controls = new OrbitControls( camera, renderer.domElement );

	const spheres = new InstancedSpheres( new MeshBasicMaterial(), POINT_COUNT );
	scene.add( spheres );

	const trails = new InstancedTrails( POINT_COUNT, SEGMENTS_COUNT );
	trails.material = new FadeLineMaterial( {
		segmentCount: SEGMENTS_COUNT,
		currIndex: 0,
	} );
	trails.material.transparent = true;
	trails.material.opacity = 0.15;
	trails.material.depthWrite = false;
	scene.add( trails );

	const pointInfo = [];
	for ( let i = 0; i < POINT_COUNT; i ++ ) {

		let v = randomSampleSphere();
		// v = new Vector3();
		trails.init( i, v );
		pointInfo.push( v );

	}

	const curl = new CurlGenerator();

	// for ( let i = 0; i < SEGMENTS_COUNT; i ++ ) {

	// 	const info = pointInfo[ 0 ];
	// 	// info.x += 0.001;
	// 	// info.y += 0.001;
	// 	// info.z += 0.001;

	// 	const c = curl.sample2( ...info );
	// 	info.addScaledVector( c, 0.001 );
	// 	spheres.setPosition( 0, info, 0.01 );
	// 	trails.pushPoint( 0, info );

	// }

	app.toggleLoading();
	app.update = () => {

		trails.material.currIndex ++;

		for ( let i = 0, l = pointInfo.length; i < l; i ++ ) {

			const info = pointInfo[ i ];
			// info.x += 0.001;
			// info.y += 0.001;
			// info.z += 0.001;

			const dir = 0.01 * ( i % 2 == 0 ? 1 : - 1 );

			const c = curl.sample3d( info.x, info.y, info.z );
			c.normalize()
			info.addScaledVector( c, dir );
			spheres.setPosition( i, info, 0.0000000000001 );
			trails.pushPoint( i, info );


			if ( Math.random() < 0.01 || info.length() > 1.0 ) {

				info.copy( randomSampleSphere() );
				trails.pushPoint( i, info, true )

			}

		}

	};

} )();
