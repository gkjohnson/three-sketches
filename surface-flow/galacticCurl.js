import { App } from '../common/App.js';
import { SurfaceWalker, SurfacePoint } from './src/SurfaceWalker.js';
import { MeshBasicMaterial, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { InstancedSpheres } from '../common/objects/InstancedSphere.js';
import { InstancedTrails } from '../common/objects/InstancedTrails.js';
import { FadeLineMaterial } from '../common/materials/FadeLineMaterial.js';
import { drawTrails } from './src/drawTrails.js';
import { CurlGenerator } from '../common/CurlGenerator.js';

const POINT_COUNT = 1000;
const SEGMENTS_COUNT = 3000;
( async () => {

	let speed = 0.005 * 120;
	let url = 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Crab.glb';
	let scale = 0.05;
	const curlGenerator = new CurlGenerator();
	curlGenerator.scale = 1.5;

	if ( window.location.hash.includes( 'Hosmer' ) ) {

		url = 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Hosmer.glb';
		curlGenerator.scale = 9 * 0.15;
		speed = 0.05 * 120 * 0.15;
		scale = 0.05 * 0.15;

	}

	const app = new App();
	app.init( document.body );

	const { camera, scene, renderer } = app;
	camera.position.set( 6, 5, 10 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.1;

	const gltf = await new GLTFLoader().setMeshoptDecoder( MeshoptDecoder ).loadAsync( url );
	const mesh = gltf.scene.children[ 0 ];
	mesh.geometry.scale( scale, scale, scale );
	mesh.geometry.rotateX( - Math.PI / 2 );
	mesh.geometry.center();

	mesh.material = new MeshBasicMaterial();
	mesh.material.transparent = true;
	mesh.material.color.set( 0x111111 ).convertSRGBToLinear();
	mesh.material.opacity = 0.5;
	mesh.material.polygonOffset = true;
	mesh.material.polygonOffsetUnits = 3;
	mesh.material.polygonOffsetFactor = 3;

	const surf = new SurfaceWalker( mesh.geometry );

	const sampler = new MeshSurfaceSampler( mesh );
	sampler.build();
	sampler.sampleWeightedFaceIndex = function () {

		const cumulativeTotal = this.distribution[ this.distribution.length - 1 ];
		return this.binarySearch( this.randomFunction() * cumulativeTotal );

	};

	const spheres = new InstancedSpheres( new MeshBasicMaterial(), POINT_COUNT );

	const trails = new InstancedTrails( POINT_COUNT, SEGMENTS_COUNT );
	trails.material = new FadeLineMaterial( {
		fadeMs: 30000,
	} );
	trails.material.opacity = 0.5;
	trails.material.transparent = true;
	trails.depthWrite = false;

	const pointInfo = [];
	for ( let i = 0; i < POINT_COUNT; i ++ ) {

		const surfacePoint = new SurfacePoint();
		surfacePoint.index = sampler.sampleWeightedFaceIndex();
		sampler.sampleFace( surfacePoint.index, surfacePoint );
		trails.init( i, surfacePoint );

		const info = {
			surfacePoint,
			direction: new Vector3( 0, 0, 1 ).randomDirection(),
		};
		pointInfo.push( info );

	}


	const normal = new Vector3();
	const temp = new Vector3();
	app.toggleLoading();
	app.update = delta => {

		for ( let i = 0, l = pointInfo.length; i < l; i ++ ) {

			const info = pointInfo[ i ];
			const { surfacePoint, direction } = info;
			curlGenerator.sample3d( ...surfacePoint, temp );

			const dir = ( i % 2 === 0 ) ? - 1 : 1;
			temp.normalize().multiplyScalar( speed * delta * dir );
			surf.movePoint( surfacePoint, temp, surfacePoint, direction, normal, p => {

				trails.pushPoint( i, p );

			} );

			temp.copy( surfacePoint );
			spheres.setPosition( i, temp, 0.01 );
			trails.pushPoint( i, temp );

			curlGenerator.sample3d( ...surfacePoint, temp );

			if ( Math.random() < 0.01 || Math.abs( temp.normalize().dot( normal ) ) > 1 - 1e-1 * Math.random() ) {

				surfacePoint.index = sampler.sampleWeightedFaceIndex();
				sampler.sampleFace( surfacePoint.index, surfacePoint );

				trails.pushPoint( i, surfacePoint, true );

			}

		}

		controls.update();
		trails.material.currentMs = window.performance.now();

		renderer.autoClear = false;
		renderer.clear();
		drawTrails( renderer, camera, mesh, trails );

	};

} )();
