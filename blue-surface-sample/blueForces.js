import { App } from '../common/App.js';
import { MeshBasicMaterial, Mesh, Raycaster, SphereGeometry, Fog, Vector3, Vector2 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlueNoiseMeshPointsGenerator } from '../common/BlueNoiseMeshPointsGenerator.js';
import { InstancedSpheres } from '../common/objects/InstancedSphere.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { SurfaceWalker, SurfacePoint } from '../surface-flow/src/SurfaceWalker.js';

const POINT_COUNT = 1200;
( async () => {

	const app = new App();
	app.init( document.body );

	const { camera, scene, renderer } = app;
	camera.position.set( 4, 4, - 7 ).multiplyScalar( 0.5 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const mouse = new Vector2( - 1, - 1 );
	let mouseDown = false;
	window.addEventListener( 'pointermove', e => {

		mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	} );

	window.addEventListener( 'pointerdown', e => {

		mouseDown = true;
		mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

	} );

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

	const surf = new SurfaceWalker( mesh.geometry );

	let points, faceIndices;
	const pointsGenerator = new BlueNoiseMeshPointsGenerator( mesh );
	pointsGenerator.sampleCount = POINT_COUNT;
	pointsGenerator.build();

	if ( window.location.hash === '#random' ) {

		const sampler = new MeshSurfaceSampler( mesh );
		sampler.build();
		sampler.sampleFaceIndex = function () {

			const cumulativeTotal = this.distribution[ this.distribution.length - 1 ];
			return this.binarySearch( this.randomFunction() * cumulativeTotal );

		};

		points = new Array( POINT_COUNT );
		faceIndices = new Array( POINT_COUNT );

		for ( let i = 0; i < POINT_COUNT; i ++ ) {

			faceIndices[ i ] = sampler.sampleFaceIndex();
			points[ i ] = new Vector3();
			sampler.sampleFace( faceIndices[ i ], points[ i ] );

		}

	} else {

		faceIndices = [];
		points = pointsGenerator.generate( faceIndices );

	}

	points = points.map( ( p, i ) => {

		const sp = new SurfacePoint();
		sp.copy( p );
		sp.index = faceIndices[ i ];
		sp.velocity = new Vector3();
		sp.acceleration = new Vector3();
		return sp;

	} );

	const spheres = new InstancedSpheres( new MeshBasicMaterial(), POINT_COUNT );
	const targetDistance = pointsGenerator.getTargetDistance();
	scene.add( spheres );

	scene.fog = new Fog( 0, 1, 2 );
	scene.fog.color.set( 0x111111 ).convertSRGBToLinear();

	app.toggleLoading();
	app.update = delta => {

		delta *= 10.0;

		controls.update();
		points.forEach( p => p.acceleration.setScalar( 0 ) );

		const raycaster = new Raycaster();
		raycaster.setFromCamera( mouse, camera );

		const temp = new Vector3();
		const deltaVec = new Vector3();
		const hit = raycaster.intersectObject( mesh )[ 0 ];
		if ( hit ) {

			const hitPoint = hit.point;
			points.forEach( p => {

				deltaVec.subVectors( p, hitPoint );

				const forceMultiplier = mouseDown ? 200 : 5;
				const distMult = mouseDown ? 20 : 10;

				const falloffDist = targetDistance * distMult;
				const lenDiff = Math.max( falloffDist - deltaVec.length(), 0 );
				const force = Math.pow( lenDiff / falloffDist, 2.0 );
				deltaVec.normalize().multiplyScalar( force * forceMultiplier );
				p.acceleration.add( deltaVec );

			} );

		}

		pointForPoint( points, ( i, j ) => {

			const p1 = points[ i ];
			const p2 = points[ j ];
			deltaVec.subVectors( p1, p2 );

			const falloffDist = targetDistance * 4;
			if ( falloffDist < deltaVec.length() ) {

				return;

			}

			const lenDiff = Math.max( falloffDist - deltaVec.length(), 0 );
			const force = Math.pow( lenDiff / falloffDist, 2.0 );
			deltaVec.normalize().multiplyScalar( force * 2.0 );

			p1.acceleration.add( deltaVec );
			p2.acceleration.sub( deltaVec );

		} );

		points.forEach( ( p, i ) => {

			let vel = p.velocity.length();
			if ( vel > 0 ) {

				p.acceleration.addScaledVector( p.velocity, - 4.5 * 0.12 / vel );

			}

			p.velocity.addScaledVector( p.acceleration, delta * 0.01 );

			vel = p.velocity.length();
			if ( vel > 0 && vel > 0.1 ) {

				p.velocity.normalize().multiplyScalar( 0.1 );

			}

			temp.copy( p.velocity ).multiplyScalar( delta );
			surf.movePoint( p, temp, p );

			spheres.setPosition( i, p, 0.01 );

		} );

		const camDist = camera.position.length();
		scene.fog.near = camDist - 1;
		scene.fog.far = camDist + 3;

		mouseDown = false;

	};

	function pointForPoint( points, cb ) {

		for ( let i = 0, l = points.length; i < l; i ++ ) {

			for ( let j = i + 1; j < l; j ++ ) {

				cb( i, j );

			}

		}

	}

} )();
