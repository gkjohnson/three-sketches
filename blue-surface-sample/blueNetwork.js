import { App } from '../common/App.js';
import { MeshBasicMaterial, Mesh, LineSegments, SphereGeometry, Fog } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlueNoiseMeshPointsGenerator } from '../common/BlueNoiseMeshPointsGenerator.js';
import { InstancedSpheres } from '../common/objects/InstancedSphere.js';

( async () => {

	const app = new App();
	app.init( document.body );

	const { camera, scene, renderer } = app;
	camera.position.set( 4, 4, - 7 ).multiplyScalar( 0.5 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.autoRotateSpeed = 0.25;
	controls.autoRotate = true;
	controls.panEnabled = false;

	const mesh = new Mesh( new SphereGeometry() );
	mesh.material.color.set( 0x111111 ).convertSRGBToLinear();
	mesh.material.opacity = 0.5;
	mesh.material.transparent = true;
	mesh.material.polygonOffset = true;
	mesh.material.polygonOffsetUnits = 10;
	mesh.material.polygonOffsetFactor = 10;

	const generator = new BlueNoiseMeshPointsGenerator( mesh );
	generator.build();

	const points = generator.generate();

	const spheres = new InstancedSpheres( new MeshBasicMaterial(), generator.sampleCount );
	points.forEach( ( p, i ) => {

		spheres.setPosition( i, p, 0.01 );

	} );

	const targetDistance = generator.getTargetDistance();
	const segments = [];
	points.forEach( ( p1, i ) => {

		for ( let j = i + 1, l = points.length; j < l; j ++ ) {

			const p2 = points[ j ];
			if ( p1.distanceTo( p2 ) < targetDistance * 2.5 ) {

				segments.push( p1, p2 );

			}

		}

	} );

	const lineSegments = new LineSegments();
	lineSegments.geometry.setFromPoints( segments );
	lineSegments.material.opacity = 0.75;
	lineSegments.material.transparent = true;

	scene.add( lineSegments, spheres );
	scene.fog = new Fog( 0, 1, 2 );
	scene.fog.color.set( 0x111111 ).convertSRGBToLinear();

	app.toggleLoading();
	app.update = delta => {

		controls.update();

		const camDist = camera.position.length();
		scene.fog.near = camDist - 1.5;
		scene.fog.far = camDist + 2.5;

	};

} )();
