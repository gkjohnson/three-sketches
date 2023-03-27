import { App } from '../common/App.js';
import { SurfaceWalker, SurfacePoint } from './src/SurfaceWalker.js';
import { Mesh, MeshBasicMaterial, Raycaster, BufferGeometry, Vector2, Vector3, MathUtils } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { InstancedSpheres } from '../common/objects/InstancedSphere.js';
import { InstancedTrails } from '../common/objects/InstancedTrails.js';
import { FadeLineMaterial } from '../common/materials/FadeLineMaterial.js';
import { drawTrails } from './src/drawTrails.js';
import { CurlGenerator } from '../common/CurlGenerator.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
Mesh.prototype.raycast = acceleratedRaycast;

const POINT_COUNT = 2000;
const SEGMENTS_COUNT = 3000;
const SPEED = 0.01 * 120;
const LIFE = 5;

( async () => {

	const url = 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Elbow_Crab.glb';
	const scale = 0.05;

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
	mesh.geometry.computeBoundsTree();

	mesh.material = new MeshBasicMaterial();
	mesh.material.transparent = true;
	mesh.material.color.set( 0x222222 ).convertSRGBToLinear();
	mesh.material.opacity = 0.5;
	mesh.material.polygonOffset = true;
	mesh.material.polygonOffsetUnits = 10;
	mesh.material.polygonOffsetFactor = 10;

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
		fadeMs: 6000.33,
	} );
	trails.material.opacity = 0.5;
	trails.material.transparent = true;
	trails.depthWrite = false;

	const curlGenerator = new CurlGenerator();
	curlGenerator.scale = MathUtils.lerp( 1, 1.1, Math.random() );

	const pointInfo = [];
	for ( let i = 0; i < POINT_COUNT; i ++ ) {

		const surfacePoint = new SurfacePoint();
		surfacePoint.index = sampler.sampleWeightedFaceIndex();
		sampler.sampleFace( surfacePoint.index, surfacePoint );
		trails.init( i, surfacePoint );

		const localGenerator = new CurlGenerator();
		localGenerator.scale = MathUtils.lerp( 1, 1.1, Math.random() );

		const info = {
			localGenerator,
			surfacePoint,
			direction: new Vector3( 0, 0, 1 ).randomDirection(),
			life: 0,
		};
		pointInfo.push( info );

	}

	let initialized = false;
	let nextPoint = 0;
	const prevMouse = new Vector2();
	const raycaster = new Raycaster();

	window.addEventListener( 'pointermove', e => {

		const mouse = new Vector2();
		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
		if ( ! initialized ) {

			prevMouse.copy( mouse );
			initialized = true;

		}

		const delta = new Vector2().subVectors( mouse, prevMouse );
		let dist = delta.length();
		delta.normalize();

		// TODO: account for screen scale
		const STEP = 0.001;
		while ( dist > STEP ) {

			prevMouse.addScaledVector( delta, STEP );
			dist -= STEP;

			const offset = new Vector2( 1, 0 );
			offset.rotateAround( new Vector2(), Math.random() * 2.0 * Math.PI );
			offset.multiplyScalar( 0.025 );
			offset.add( prevMouse );
			raycaster.setFromCamera( offset, camera );

			const hit = raycaster.intersectObject( mesh, true )[ 0 ];

			if ( hit ) {

				nextPoint = ( nextPoint + 1 ) % POINT_COUNT;
				pointInfo[ nextPoint ].life = LIFE + Math.random() * 0.5;

				const { surfacePoint } = pointInfo[ nextPoint ];
				surfacePoint.copy( hit.point );
				surfacePoint.index = hit.faceIndex;
				trails.pushPoint( nextPoint, surfacePoint, true );


			}

		}

	} );







	const normal = new Vector3();
	const temp = new Vector3();
	const temp2 = new Vector3();
	app.toggleLoading();
	app.update = delta => {

		for ( let i = 0, l = pointInfo.length; i < l; i ++ ) {

			const info = pointInfo[ i ];
			if ( info.life <= 0.0 ) {

				continue;

			}

			const { surfacePoint, direction, localGenerator } = info;
			info.life -= delta;
			curlGenerator.sample3d( ...surfacePoint, temp );
			// localGenerator.sample3d( ...surfacePoint, temp );

			// temp.addScaledVector( temp2, 0.1 );

			const dir = ( i % 2 === 0 ) ? - 1 : 1;
			temp.normalize().multiplyScalar( SPEED * delta * dir );
			surf.movePoint( surfacePoint, temp, surfacePoint, direction, normal );

			temp.copy( surfacePoint );
			spheres.setPosition( i, temp, 0.01 );
			trails.pushPoint( i, temp );

			curlGenerator.sample3d( ...surfacePoint, temp );
			if ( Math.random() > info.life || Math.abs( temp.normalize().dot( normal ) ) > 1 - 1e-1 * Math.random() ) {

				info.life = 0;

			}

		}

		controls.update();
		trails.material.currentMs = window.performance.now();

		renderer.autoClear = false;
		renderer.clear();
		drawTrails( renderer, camera, mesh, trails );

	};

} )();
