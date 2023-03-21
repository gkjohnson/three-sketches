import { App } from '../common/App.js';
import { SurfaceWalker, SurfacePoint, TriangleFrame } from './src/SurfaceWalker.js';
import { MeshBasicMaterial, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { InstancedSpheres } from '../common/objects/InstancedSphere.js';
import { InstancedTrails } from '../common/objects/InstancedTrails.js';
import { FadeLineMaterial } from '../common/materials/FadeLineMaterial.js';
import { drawTrails } from './src/drawTrails.js';

const POINT_COUNT = 100;
const SEGMENTS_COUNT = 1000;
const SPEED = 0.01 * 120;
( async () => {

	const app = new App();
	app.init( document.body );

	const { camera, scene, renderer } = app;
	camera.position.set( 9, 7, 8 );
	camera.lookAt( 0, 0, 0 );
	renderer.setClearColor( 0x111111 );

	const controls = new OrbitControls( camera, renderer.domElement );

	const gltf = await new GLTFLoader().setMeshoptDecoder( MeshoptDecoder ).loadAsync( 'https://raw.githubusercontent.com/gkjohnson/3d-demo-data/main/models/threedscans/Le_Transi_De_Rene_De_Chalon.glb' );
	const mesh = gltf.scene.children[ 0 ];
	mesh.geometry.scale( 0.005, 0.005, 0.005 );
	mesh.geometry.center();

	mesh.material = new MeshBasicMaterial();
	mesh.material.transparent = true;
	mesh.material.color.set( 0x111111 ).convertSRGBToLinear();
	mesh.material.opacity = 0.5;
	mesh.material.polygonOffset = true;
	mesh.material.polygonOffsetUnits = 2;
	mesh.material.polygonOffsetFactor = 2;

	const surf = new SurfaceWalker( mesh.geometry );
	surf.planarWalk = true;

	const sampler = new MeshSurfaceSampler( mesh );
	sampler.build();
	sampler.sampleWeightedFaceIndex = function () {

		const cumulativeTotal = this.distribution[ this.distribution.length - 1 ];
		return this.binarySearch( this.randomFunction() * cumulativeTotal );

	};

	const spheres = new InstancedSpheres( new MeshBasicMaterial(), POINT_COUNT );

	const trails = new InstancedTrails( POINT_COUNT, SEGMENTS_COUNT );
	trails.material = new FadeLineMaterial( {
		segmentCount: SEGMENTS_COUNT,
		currIndex: 0,
	} );
	trails.material.opacity = 0.5;
	trails.material.transparent = true;

	const v0 = new Vector3();
	const v1 = new Vector3();
	const v2 = new Vector3();
	const pointInfo = [];

	for ( let i = 0; i < POINT_COUNT; i ++ ) {

		const surfacePoint = new SurfacePoint();
		surfacePoint.index = sampler.sampleWeightedFaceIndex();
		sampler.sampleFace( surfacePoint.index, surfacePoint );
		trails.init( i, surfacePoint );

		v0.copy( surfacePoint );
		v0.y = 0;
		v0.normalize();
		v1.set( 0, 1, 0 );

		const dir = new Vector3().crossVectors( v0, v1 );
		const info = {
			surfacePoint,
			direction: dir,
		};
		pointInfo.push( info );

	}


	const normal = new Vector3();
	const temp = new Vector3();
	app.toggleLoading();
	app.update = delta => {

		controls.update();

		trails.material.currIndex ++;
		for ( let i = 0, l = pointInfo.length; i < l; i ++ ) {

			const info = pointInfo[ i ];
			const { surfacePoint, direction } = info;

			const frame = new TriangleFrame();
			surf._getFrame( surfacePoint.index, frame );

			v1.set( 0, 1, 0 );

			if ( Math.abs( v1.dot( frame.normal ) ) > 0.99 ) {

				v0.copy( surfacePoint );

			} else {

				v0.copy( frame.normal );

			}

			v0.y = 0;
			v0.normalize();

			v2.crossVectors( v0, v1 );
			v2.addScaledVector( surfacePoint, - 0.1 * Math.sign( frame.normal.y ) );
			v2.y = 0.25;

			direction.copy( v2 );

			direction.normalize().multiplyScalar( SPEED * delta );
			surf.movePoint( surfacePoint, direction, surfacePoint, direction, normal );

			const dist = temp.distanceTo( camera.position );
			temp.copy( surfacePoint );
			spheres.setPosition( i, temp, 0.0005 * dist );
			trails.pushPoint( i, temp );

			if ( Math.random() < 0.5 * SPEED * delta ) {

				surfacePoint.index = sampler.sampleWeightedFaceIndex();
				sampler.sampleFace( surfacePoint.index, surfacePoint );

				trails.pushPoint( i, surfacePoint, true );

			}

		}

		renderer.autoClear = false;
		renderer.clear();
		renderer.render( spheres, camera );
		drawTrails( renderer, camera, mesh, trails );

	};

} )();
