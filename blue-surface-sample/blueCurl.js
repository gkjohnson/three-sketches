import { App } from '../common/App.js';
import { Mesh, SphereGeometry, Vector3, Fog } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BlueNoiseMeshPointsGenerator } from '../common/BlueNoiseMeshPointsGenerator.js';
import { CurlGenerator } from '../common/CurlGenerator.js';
import { SurfaceWalker, SurfacePoint } from '../surface-flow/src/SurfaceWalker.js';
import { InstancedTrails } from '../common/objects/InstancedTrails.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { drawTrails } from '../surface-flow/src/drawTrails.js';

const POINT_COUNT = 1500;
const SEGMENTS_COUNT = 1000;
const SPEED = 0.002 * 120;
const LIFE = 7000;

( async () => {

	const app = new App();
	app.init( document.body );

	const { camera, renderer } = app;
	camera.position.set( 4, 4, - 7 ).multiplyScalar( 0.5 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.autoRotateSpeed = 0.25;
	controls.autoRotate = true;
	controls.panEnabled = false;

	const mesh = new Mesh( new SphereGeometry( 1, 64, 32 ) );
	mesh.material.color.set( 0x111111 ).convertSRGBToLinear();
	mesh.material.opacity = 0.65;
	mesh.material.transparent = true;
	mesh.material.polygonOffset = true;
	mesh.material.polygonOffsetUnits = 1;
	mesh.material.polygonOffsetFactor = 1;

	const surf = new SurfaceWalker( mesh.geometry );

	const curlGenerator = new CurlGenerator();
	curlGenerator.scale = 1.5;

	const trails = new InstancedTrails( 2 * POINT_COUNT, SEGMENTS_COUNT );
	trails.material.opacity = 0.5;
	trails.material.transparent = true;

	let points, faceIndices;
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

		const pointsGenerator = new BlueNoiseMeshPointsGenerator( mesh );
		pointsGenerator.sampleCount = POINT_COUNT;
		pointsGenerator.build();

		faceIndices = [];
		points = pointsGenerator.generate( faceIndices );

	}


	const pointInfo = [];
	points.map( ( point, i ) => {

		const surfacePoint = new SurfacePoint();
		surfacePoint.index = faceIndices[ i ];
		surfacePoint.copy( point );
		trails.init( 2 * i, surfacePoint );

		const surfacePoint2 = new SurfacePoint();
		surfacePoint2.index = faceIndices[ i ];
		surfacePoint2.copy( point );
		trails.init( 2 * i + 1, surfacePoint2 );

		pointInfo.push( {
			surfacePoint,
			direction: new Vector3(),
		}, {
			surfacePoint: surfacePoint2,
			direction: new Vector3(),
		} );

	} );

	let life = LIFE * 1e-3;
	app.toggleLoading();
	app.update = delta => {

		controls.update();


		if ( life > 0 ) {

			life -= delta;
			for ( let i = 0; i < pointInfo.length; i += 2 ) {

				updatePoint( i, delta, 1 );
				updatePoint( i + 1, delta, - 1 );

			}

		}

		renderer.autoClear = false;
		renderer.clear();
		drawTrails( renderer, camera, mesh, trails );

	};

	const temp = new Vector3();
	const normal = new Vector3();
	function updatePoint( i, delta, dir ) {

		const info = pointInfo[ i ];
		const { surfacePoint, direction } = info;
		curlGenerator.sample3d( ...surfacePoint, temp );

		temp.normalize().multiplyScalar( SPEED * delta * dir );
		surf.movePoint( surfacePoint, temp, surfacePoint, direction, normal, p => {

			trails.pushPoint( i, p );

		} );

		temp.copy( surfacePoint );
		trails.pushPoint( i, temp );

	}

} )();
