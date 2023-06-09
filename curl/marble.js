import { App } from '../common/App.js';
import { Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { InstancedTrails } from '../common/objects/InstancedTrails.js';
import { CurlGenerator } from '../common/CurlGenerator.js';
import { FadeLineMaterial } from '../common/materials/FadeLineMaterial.js';

const POINT_COUNT = 1000;
const SEGMENTS_COUNT = 1000;
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
	camera.position.set( 0, 0, - 3 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.5;

	const trails = new InstancedTrails( POINT_COUNT, SEGMENTS_COUNT );
	trails.material = new FadeLineMaterial( {
		fadeMs: 8333.0
	} );
	trails.material.transparent = true;
	trails.material.opacity = 0.15;
	trails.material.depthWrite = false;
	scene.add( trails );

	const pointInfo = [];
	for ( let i = 0; i < POINT_COUNT; i ++ ) {

		const point = randomSampleSphere();
		trails.init( i, point );
		pointInfo.push( point );

	}

	const generator = new CurlGenerator();

	const result = new Vector3();
	for ( let i = 0, l = pointInfo.length; i < l; i ++ ) {

		for ( let j = 0; j < SEGMENTS_COUNT; j ++ ) {

			const point = pointInfo[ i ];
			const dir = i % 2 == 0 ? 1 : - 1;

			generator.sample3d( point.x, point.y, point.z, result );
			point.addScaledVector( result.normalize(), SPEED * dir );
			trails.pushPoint( i, point );

			if ( point.length() > 1.0 ) {

				point.copy( randomSampleSphere() );
				trails.pushPoint( i, point, true );

			}

		}

	}

	trails.material.currentMs = window.performance.now();

	app.toggleLoading();
	app.update = () => {

		controls.update();

	};

} )();
